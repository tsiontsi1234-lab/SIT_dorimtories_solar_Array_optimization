/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { getSolarDeclination, getHourAngle, getSolarElevation, getSolarAzimuth, getSunVector, getPanelNormal, getSolarIntensity, calculatePower } from "../utils/solarMath";

interface Solar3DViewProps {
  latitude: number;
  dayOfYear: number;
  timeOfDay: number;
  fixedTilt: number;
  fixedAzimuth: number;
}

export const Solar3DView: React.FC<Solar3DViewProps> = ({
  latitude,
  dayOfYear,
  timeOfDay,
  fixedTilt,
  fixedAzimuth,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Screen projections for HTML overlays
  const [overlays, setOverlays] = useState<{
    fixed: { x: number; y: number; angle: number; cosTheta: number; power: number; visible: boolean };
    tracking: { x: number; y: number; angle: number; cosTheta: number; power: number; visible: boolean };
    sun: { x: number; y: number; elevation: number; azimuth: number; visible: boolean };
  }>({
    fixed: { x: 0, y: 0, angle: 0, cosTheta: 0, power: 0, visible: false },
    tracking: { x: 0, y: 0, angle: 0, cosTheta: 0, power: 0, visible: false },
    sun: { x: 0, y: 0, elevation: 0, azimuth: 0, visible: false },
  });

  // Camera Orbit State
  const cameraOrbitRef = useRef({
    theta: Math.PI / 4,     // Polar rotation (horizontal)
    phi: Math.PI / 3,       // Azimuthal elevation (vertical, restricted)
    radius: 15.0,           // Distance
    isDragging: false,
    startX: 0,
    startY: 0,
  });

  // Track panel angles and sun parameters for the render loop
  const paramsRef = useRef({ latitude, dayOfYear, timeOfDay, fixedTilt, fixedAzimuth });
  useEffect(() => {
    paramsRef.current = { latitude, dayOfYear, timeOfDay, fixedTilt, fixedAzimuth };
  }, [latitude, dayOfYear, timeOfDay, fixedTilt, fixedAzimuth]);

  // Main ThreeJS Setup
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 450;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // Slate-900

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 2. Lights
    // Ambient Sky light (cool tone)
    const ambientLight = new THREE.AmbientLight(0x38bdf8, 0.35);
    scene.add(ambientLight);

    // Sun Directional light (warm tone, casts shadows)
    const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.2);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 40;
    sunLight.shadow.camera.left = -8;
    sunLight.shadow.camera.right = 8;
    sunLight.shadow.camera.top = 8;
    sunLight.shadow.camera.bottom = -8;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // 3. Ground Platform & Compass Ring
    // Circular dark concrete testing platform
    const platformGeo = new THREE.CylinderGeometry(6.5, 6.5, 0.15, 64);
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // Slate-800
      roughness: 0.85,
      metalness: 0.1,
    });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.y = -0.075;
    platform.receiveShadow = true;
    scene.add(platform);

    // Grid Overlay
    const grid = new THREE.GridHelper(13, 13, 0x475569, 0x334155);
    grid.position.y = 0.01;
    scene.add(grid);

    // Outer Compass Ring
    const ringGeo = new THREE.RingGeometry(6.3, 6.4, 64);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x64748b, side: THREE.DoubleSide });
    const compassRing = new THREE.Mesh(ringGeo, ringMat);
    compassRing.position.y = 0.02;
    scene.add(compassRing);

    // 4. Reference Axes (X=East (Red), Y=Up (Green), Z=South (Blue))
    const eastAxis = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0.03, 0), 1.5, 0xef4444, 0.3, 0.15); // Red
    const upAxis = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0.03, 0), 1.5, 0x22c55e, 0.3, 0.15);   // Green
    const southAxis = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0.03, 0), 1.5, 0x3b82f6, 0.3, 0.15); // Blue
    scene.add(eastAxis);
    scene.add(upAxis);
    scene.add(southAxis);

    // 5. Build Solar Panels Side by Side
    // Fixed Panel is at X = -2.2
    // Tracking Panel is at X = 2.2
    const panelGroupFixed = new THREE.Group();
    panelGroupFixed.position.set(-2.2, 0, 0);
    scene.add(panelGroupFixed);

    const panelGroupTracking = new THREE.Group();
    panelGroupTracking.position.set(2.2, 0, 0);
    scene.add(panelGroupTracking);

    // Common Panel geometry structure
    const createPanelMesh = () => {
      const group = new THREE.Group();

      // Post (Cylinder)
      const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 16);
      const postMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.y = 0.6;
      post.castShadow = true;
      post.receiveShadow = true;
      group.add(post);

      // Rotating head parent (the mount point)
      const mountGroup = new THREE.Group();
      mountGroup.position.y = 1.2; // Mount sits on top of the 1.2m post

      // Panel frame (metallic backing)
      const frameGeo = new THREE.BoxGeometry(1.8, 0.05, 1.2);
      const frameMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.8, roughness: 0.3 });
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.castShadow = true;
      frame.receiveShadow = true;
      mountGroup.add(frame);

      // Photovoltaic cells surface (deep glossy blue)
      const cellGeo = new THREE.BoxGeometry(1.74, 0.01, 1.14);
      const cellMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.1, metalness: 0.5 });
      const cell = new THREE.Mesh(cellGeo, cellMat);
      cell.position.y = 0.026; // sit on top of frame
      cell.castShadow = true;
      cell.receiveShadow = true;
      mountGroup.add(cell);

      // Grid Lines on panel to look authentic
      const gridGroup = new THREE.Group();
      gridGroup.position.y = 0.033;
      // 5 vertical grid lines
      for (let i = -2; i <= 2; i++) {
        const lineGeo = new THREE.BoxGeometry(0.005, 0.002, 1.12);
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const line = new THREE.Mesh(lineGeo, lineMat);
        line.position.x = (i * 1.7) / 5;
        gridGroup.add(line);
      }
      // 3 horizontal grid lines
      for (let i = -1; i <= 1; i++) {
        const lineGeo = new THREE.BoxGeometry(1.72, 0.002, 0.005);
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const line = new THREE.Mesh(lineGeo, lineMat);
        line.position.z = (i * 1.1) / 3;
        gridGroup.add(line);
      }
      mountGroup.add(gridGroup);

      group.add(mountGroup);

      return { panelGroup: group, mountGroup, cellMesh: cell };
    };

    const fixedPanel = createPanelMesh();
    panelGroupFixed.add(fixedPanel.panelGroup);

    const trackingPanel = createPanelMesh();
    panelGroupTracking.add(trackingPanel.panelGroup);

    // 6. Vector Arrows & Angular Arcs
    // Fixed Panel Arrows (Incoming sun, panel normal)
    const fixedSunArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 1.2, 0), 1.5, 0xf59e0b, 0.25, 0.12);
    const fixedNormalArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 1.2, 0), 1.5, 0x3b82f6, 0.25, 0.12);
    panelGroupFixed.add(fixedSunArrow);
    panelGroupFixed.add(fixedNormalArrow);

    // Tracking Panel Arrows
    const trackingSunArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 1.2, 0), 1.5, 0xf59e0b, 0.25, 0.12);
    const trackingNormalArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 1.2, 0), 1.5, 0x3b82f6, 0.25, 0.12);
    panelGroupTracking.add(trackingSunArrow);
    panelGroupTracking.add(trackingNormalArrow);

    // Angular arc lines (drawn in 3D to show the incidence angle)
    const fixedArcGeo = new THREE.BufferGeometry();
    const fixedArcMat = new THREE.LineBasicMaterial({ color: 0x10b981, linewidth: 2 }); // Green
    const fixedArcLine = new THREE.Line(fixedArcGeo, fixedArcMat);
    panelGroupFixed.add(fixedArcLine);

    const trackingArcGeo = new THREE.BufferGeometry();
    const trackingArcMat = new THREE.LineBasicMaterial({ color: 0x10b981, linewidth: 2 });
    const trackingArcLine = new THREE.Line(trackingArcGeo, trackingArcMat);
    panelGroupTracking.add(trackingArcLine);

    // 7. Visual Sun Orb (glow sphere)
    const sunOrbGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const sunOrbMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
    const sunOrb = new THREE.Mesh(sunOrbGeo, sunOrbMat);
    scene.add(sunOrb);

    // Sunbeam connection lines
    const fixedSunbeamGeo = new THREE.BufferGeometry();
    const trackingSunbeamGeo = new THREE.BufferGeometry();
    const sunbeamMat = new THREE.LineDashedMaterial({ color: 0xfabf2c, dashSize: 0.2, gapSize: 0.1 });
    
    const fixedSunbeam = new THREE.Line(fixedSunbeamGeo, sunbeamMat);
    scene.add(fixedSunbeam);

    const trackingSunbeam = new THREE.Line(trackingSunbeamGeo, sunbeamMat);
    scene.add(trackingSunbeam);

    // 8. Animation & Render Loop
    let animationFrameId = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Retrieve reactive params from ref
      const { latitude: lat, dayOfYear: day, timeOfDay: tod, fixedTilt: tilt, fixedAzimuth: az } = paramsRef.current;

      const latRad = lat * (Math.PI / 180);
      const declinationRad = getSolarDeclination(day);
      const H = getHourAngle(tod);
      const elevation = getSolarElevation(latRad, declinationRad, H);
      const azimuth = getSolarAzimuth(latRad, declinationRad, H);

      // A. Position Sun Orb
      const isSunUp = elevation > 0;
      // Position the visual sun along its vector, scaled outward
      const sunDist = 14.0;
      const sunVec = getSunVector(elevation, azimuth);
      const sunPos3D = new THREE.Vector3(
        sunVec.x * sunDist,
        sunVec.y * sunDist,
        sunVec.z * sunDist
      );
      sunOrb.position.copy(sunPos3D);
      sunOrb.visible = isSunUp;

      // Position directional light exactly at the sun orb
      sunLight.position.copy(sunPos3D);
      sunLight.intensity = isSunUp ? Math.max(0.2, Math.sin(elevation) * 1.5) : 0;

      const sunDirUnit = new THREE.Vector3(sunVec.x, sunVec.y, sunVec.z).normalize();

      // B. Update Fixed Panel Orientation
      const beta = tilt * (Math.PI / 180);
      const gamma = az * (Math.PI / 180);

      // Reset mount group rotation
      fixedPanel.mountGroup.rotation.set(0, 0, 0);
      // Azimuth rotation around Y
      fixedPanel.mountGroup.rotation.y = -gamma; 
      // Tilt rotation around local X
      fixedPanel.mountGroup.rotateX(beta);

      // C. Update Tracking Panel Orientation
      // Standard tracker tracks the sun. Its normal is sunVec when sun is up.
      // If sun is down, it goes to flat stow (normal = 0, 1, 0)
      trackingPanel.mountGroup.rotation.set(0, 0, 0);
      if (isSunUp) {
        // Target is the sun position. But the normal of our panel is local +Y.
        // In our mesh builder, we constructed the panel facing local +Y (frame is X-Z, cells face +Y).
        // To make the local +Y face the sun, we can compute the orientation.
        // Let's create a vector pointing to the sun from the tracking panel mount
        const localSunVec = sunDirUnit.clone();
        
        // Let's compute a rotation that maps (0,1,0) to localSunVec
        const upVec = new THREE.Vector3(0, 1, 0);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(upVec, localSunVec);
        trackingPanel.mountGroup.quaternion.copy(quaternion);
      } else {
        // Flat stow at night
        trackingPanel.mountGroup.rotation.set(0, 0, 0);
      }

      // D. Update Vector Arrows
      const fixedNormal = getPanelNormal(beta, gamma);
      const fixedNormal3D = new THREE.Vector3(fixedNormal.x, fixedNormal.y, fixedNormal.z);
      
      const trackingNormal3D = new THREE.Vector3();
      if (isSunUp) {
        trackingNormal3D.copy(sunDirUnit);
      } else {
        trackingNormal3D.set(0, 1, 0);
      }

      // Arrows starting at mount centers (y = 1.2)
      const fixedCenter = new THREE.Vector3(-2.2, 1.2, 0);
      const trackingCenter = new THREE.Vector3(2.2, 1.2, 0);

      // Sunlight arrows point TOWARDS the panel centers
      // So they start at Center + sunDir * 1.5 and point along -sunDir
      if (isSunUp) {
        fixedSunArrow.setDirection(sunDirUnit.clone().negate());
        fixedSunArrow.position.copy(fixedCenter.clone().addScaledVector(sunDirUnit, 1.5));
        fixedSunArrow.visible = true;

        trackingSunArrow.setDirection(sunDirUnit.clone().negate());
        trackingSunArrow.position.copy(trackingCenter.clone().addScaledVector(sunDirUnit, 1.5));
        trackingSunArrow.visible = true;
      } else {
        fixedSunArrow.visible = false;
        trackingSunArrow.visible = false;
      }

      // Normal arrows point OUT from panel surfaces
      fixedNormalArrow.setDirection(fixedNormal3D);
      fixedNormalArrow.position.copy(fixedCenter);
      fixedNormalArrow.visible = true;

      trackingNormalArrow.setDirection(trackingNormal3D);
      trackingNormalArrow.position.copy(trackingCenter);
      trackingNormalArrow.visible = true;

      // E. Update Angle Incidence Arcs
      const drawArc = (line: THREE.Line, vNormal: THREE.Vector3, vSun: THREE.Vector3, origin: THREE.Vector3) => {
        if (!isSunUp) {
          line.visible = false;
          return;
        }
        
        const dot = vNormal.dot(vSun);
        const thetaAngle = Math.acos(Math.max(-1, Math.min(1, dot)));
        
        if (thetaAngle < 0.02) {
          line.visible = false;
          return;
        }

        const arcPoints: THREE.Vector3[] = [];
        const steps = 16;
        const radius = 0.5; // size of the arc

        // Compute rotation axis perpendicular to normal and sun direction
        const rotAxis = new THREE.Vector3().crossVectors(vNormal, vSun).normalize();
        
        if (rotAxis.lengthSq() < 0.001) {
          line.visible = false;
          return;
        }

        for (let i = 0; i <= steps; i++) {
          const t = (i / steps) * thetaAngle;
          // Start from normal, rotate towards sun
          const p = vNormal.clone().applyAxisAngle(rotAxis, t).multiplyScalar(radius).add(new THREE.Vector3(0, 1.2, 0));
          // Note: coordinates in the panel's local group are offset, but arrows are in panelGroup coordinates
          arcPoints.push(new THREE.Vector3(p.x, p.y - 1.2, p.z)); // offset relative to panel center
        }

        line.geometry.setFromPoints(arcPoints);
        line.visible = true;
      };

      drawArc(fixedArcLine, fixedNormal3D, sunDirUnit, fixedCenter);
      drawArc(trackingArcLine, trackingNormal3D, sunDirUnit, trackingCenter);

      // F. Sunbeams
      if (isSunUp) {
        fixedSunbeam.geometry.setFromPoints([sunPos3D, fixedCenter]);
        trackingSunbeam.geometry.setFromPoints([sunPos3D, trackingCenter]);
        fixedSunbeam.computeLineDistances();
        trackingSunbeam.computeLineDistances();
        fixedSunbeam.visible = true;
        trackingSunbeam.visible = true;
      } else {
        fixedSunbeam.visible = false;
        trackingSunbeam.visible = false;
      }

      // G. Move Camera based on Orbit state
      const orbit = cameraOrbitRef.current;
      const camX = orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta);
      const camY = orbit.radius * Math.cos(orbit.phi);
      const camZ = orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta);
      camera.position.set(camX, camY, camZ);
      camera.lookAt(0, 1.0, 0); // focus on the mount level

      renderer.render(scene, camera);

      // H. Projects 3D vectors to Screen Coordinates for HTML overlays
      const getScreenCoords = (worldPos: THREE.Vector3) => {
        const tempV = worldPos.clone();
        tempV.project(camera);
        
        // Check if behind camera
        const visible = tempV.z <= 1.0;
        
        const x = (tempV.x * 0.5 + 0.5) * width;
        const y = (1.0 - (tempV.y * 0.5 + 0.5)) * height;
        return { x, y, visible };
      };

      const fixedWorldCenter = new THREE.Vector3(-2.2, 1.8, 0); // Floating slightly above panel
      const trackingWorldCenter = new THREE.Vector3(2.2, 1.8, 0);
      const sunWorldCenter = sunPos3D.clone();

      const fixedProj = getScreenCoords(fixedWorldCenter);
      const trackingProj = getScreenCoords(trackingWorldCenter);
      const sunProj = getScreenCoords(sunWorldCenter);

      // Compute mathematical incidence angles
      const fixedIntensity = getSolarIntensity(elevation);
      const fixedRes = calculatePower(fixedIntensity, sunVec, fixedNormal);
      const trackRes = calculatePower(fixedIntensity, sunVec, isSunUp ? sunVec : { x: 0, y: 1, z: 0 });

      const fixedAngleIncidence = isSunUp ? Math.acos(Math.max(-1, Math.min(1, fixedNormal3D.dot(sunDirUnit)))) * (180 / Math.PI) : 0;
      const trackingAngleIncidence = 0; // tracking panel is always aligned, so 0 degrees

      setOverlays({
        fixed: {
          x: fixedProj.x,
          y: fixedProj.y,
          angle: parseFloat(fixedAngleIncidence.toFixed(1)),
          cosTheta: parseFloat(fixedRes.cosTheta.toFixed(3)),
          power: parseFloat(fixedRes.power.toFixed(0)),
          visible: fixedProj.visible && isSunUp,
        },
        tracking: {
          x: trackingProj.x,
          y: trackingProj.y,
          angle: trackingAngleIncidence,
          cosTheta: isSunUp ? 1.0 : 0,
          power: parseFloat(trackRes.power.toFixed(0)),
          visible: trackingProj.visible && isSunUp,
        },
        sun: {
          x: sunProj.x,
          y: sunProj.y,
          elevation: parseFloat((elevation * (180 / Math.PI)).toFixed(1)),
          azimuth: parseFloat((azimuth * (180 / Math.PI)).toFixed(1)),
          visible: sunProj.visible && isSunUp,
        },
      });
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight || 450;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      renderer.dispose();
    };
  }, []);

  // Mouse Orbit Event Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const orbit = cameraOrbitRef.current;
    orbit.isDragging = true;
    orbit.startX = e.clientX;
    orbit.startY = e.clientY;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const orbit = cameraOrbitRef.current;
    if (!orbit.isDragging) return;

    const dx = e.clientX - orbit.startX;
    const dy = e.clientY - orbit.startY;

    orbit.theta -= dx * 0.007; // rotate horizontal
    orbit.phi -= dy * 0.007;   // rotate vertical

    // Restrict polar angle phi so camera stays above ground and doesn't invert
    orbit.phi = Math.max(0.05, Math.min(Math.PI / 2 - 0.02, orbit.phi));

    orbit.startX = e.clientX;
    orbit.startY = e.clientY;
  };

  const handleMouseUpOrLeave = () => {
    cameraOrbitRef.current.isDragging = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    const orbit = cameraOrbitRef.current;
    orbit.radius += e.deltaY * 0.015;
    // zoom boundaries
    orbit.radius = Math.max(6.0, Math.min(28.0, orbit.radius));
  };

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-[450px] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden select-none cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUpOrLeave}
      onMouseLeave={handleMouseUpOrLeave}
      onWheel={handleWheel}
      id="simulation-3d-viewport"
    >
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />

      {/* HTML Overlays Projected over 3D Space */}
      
      {/* 1. Fixed Panel Overlay */}
      {overlays.fixed.visible && (
        <div 
          className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-full px-2.5 py-1.5 bg-slate-900/90 border border-indigo-500/50 rounded-lg shadow-lg text-[10px] text-slate-200 backdrop-blur-xs min-w-[120px]"
          style={{ left: `${overlays.fixed.x}px`, top: `${overlays.fixed.y}px` }}
        >
          <div className="font-semibold text-indigo-400 mb-0.5 border-b border-indigo-950 pb-0.5">Fixed Panel</div>
          <div className="flex justify-between">
            <span>Incidence Angle:</span>
            <span className="font-mono text-emerald-400 font-semibold">{overlays.fixed.angle}°</span>
          </div>
          <div className="flex justify-between">
            <span>cos(θ):</span>
            <span className="font-mono text-cyan-400">{overlays.fixed.cosTheta}</span>
          </div>
          <div className="flex justify-between font-semibold text-white mt-0.5 pt-0.5 border-t border-slate-800">
            <span>Output:</span>
            <span className="font-mono text-amber-400">{overlays.fixed.power} W</span>
          </div>
        </div>
      )}

      {/* 2. Tracking Panel Overlay */}
      {overlays.tracking.visible && (
        <div 
          className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-full px-2.5 py-1.5 bg-slate-900/90 border border-amber-500/50 rounded-lg shadow-lg text-[10px] text-slate-200 backdrop-blur-xs min-w-[120px]"
          style={{ left: `${overlays.tracking.x}px`, top: `${overlays.tracking.y}px` }}
        >
          <div className="font-semibold text-amber-400 mb-0.5 border-b border-amber-950 pb-0.5">Tracking Panel</div>
          <div className="flex justify-between">
            <span>Incidence Angle:</span>
            <span className="font-mono text-emerald-400 font-semibold">{overlays.tracking.angle}°</span>
          </div>
          <div className="flex justify-between">
            <span>cos(θ):</span>
            <span className="font-mono text-cyan-400">1.000</span>
          </div>
          <div className="flex justify-between font-semibold text-white mt-0.5 pt-0.5 border-t border-slate-800">
            <span>Output:</span>
            <span className="font-mono text-amber-400">{overlays.tracking.power} W</span>
          </div>
        </div>
      )}

      {/* 3. Sun Overlay */}
      {overlays.sun.visible && (
        <div 
          className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-full px-2 py-1 bg-amber-500/95 text-slate-950 font-medium rounded shadow-md text-[9px] font-mono backdrop-blur-xs flex items-center gap-1.5"
          style={{ left: `${overlays.sun.x}px`, top: `${overlays.sun.y - 20}px` }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
          <span>Sun: El {overlays.sun.elevation}° | Az {overlays.sun.azimuth}°</span>
        </div>
      )}

      {/* Static 3D View Overlays */}
      <div className="absolute top-3 left-3 bg-slate-900/80 border border-slate-800 px-3 py-2 rounded-lg text-[10px] text-slate-300 backdrop-blur-md pointer-events-none flex flex-col gap-1 shadow-md">
        <div className="font-semibold text-slate-200 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-indigo-500" /> Fixed Panel (Left)
        </div>
        <div className="font-semibold text-slate-200 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" /> Tracking Panel (Right)
        </div>
        <div className="text-slate-400 border-t border-slate-800 pt-1 mt-1 font-mono text-[9px]">
          Drag to Rotate | Scroll to Zoom
        </div>
      </div>

      <div className="absolute bottom-3 left-3 flex gap-2 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg text-[9px] text-slate-400 font-mono pointer-events-none shadow-md">
        <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-red-500 inline-block" /> East (+X)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-emerald-500 inline-block" /> Up (+Y)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-blue-500 inline-block" /> South (+Z)</span>
      </div>

      <div className="absolute top-3 right-3 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg text-[10px] font-semibold text-slate-300 font-mono pointer-events-none shadow-md">
        COMPASS ORIENTED
      </div>
    </div>
  );
};
