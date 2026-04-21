"use client";

import * as THREE from "three";

export interface UPSProps {
  position: { u: number; height: number }; // U position and height (typically 4U)
  brand?: string; // e.g., "APC", "Eaton", "HP"
}

export function createUPS(props: UPSProps): THREE.Group {
  const { position } = props;
  const upsGroup = new THREE.Group();

  // Rack dimensions
  const uHeight = 0.045;
  const rackWidth = 0.38;

  // UPS dimensions (4U typical)
  const upsWidth = rackWidth;
  const upsHeight = position.height * uHeight - 0.003; // Height based on U count
  const upsDepth = 0.85; // Deeper than server

  // ===== MAIN CHASSIS =====
  const chassisMaterial = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
  const chassisGeometry = new THREE.BoxGeometry(upsWidth, upsHeight, upsDepth);
  const chassisMesh = new THREE.Mesh(chassisGeometry, chassisMaterial);
  upsGroup.add(chassisMesh);

  // ===== FRONT BEZEL =====
  const bezelMaterial = new THREE.MeshBasicMaterial({ color: 0x2a2a2a });
  const bezelGeometry = new THREE.BoxGeometry(
    upsWidth * 0.95,
    upsHeight * 0.95,
    0.015
  );
  const bezelMesh = new THREE.Mesh(bezelGeometry, bezelMaterial);
  bezelMesh.position.z = upsDepth / 2 + 0.008;
  upsGroup.add(bezelMesh);

  // ===== LCD DISPLAY =====
  const displayMaterial = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
  const displayGeometry = new THREE.BoxGeometry(
    upsWidth * 0.7,
    upsHeight * 0.25,
    0.002
  );
  const displayMesh = new THREE.Mesh(displayGeometry, displayMaterial);
  displayMesh.position.set(0, upsHeight / 2 - 0.08, upsDepth / 2 + 0.009);
  upsGroup.add(displayMesh);

  // Display border
  const displayBorderMaterial = new THREE.LineBasicMaterial({
    color: 0x555555,
    linewidth: 2,
  });
  const displayBorderGeometry = new THREE.BufferGeometry();
  const displayWidth = upsWidth * 0.7;
  const displayHeight = upsHeight * 0.25;
  const displayBorderPositions = new Float32Array([
    -displayWidth / 2,
    upsHeight / 2 - 0.08 - displayHeight / 2,
    upsDepth / 2 + 0.01,
    displayWidth / 2,
    upsHeight / 2 - 0.08 - displayHeight / 2,
    upsDepth / 2 + 0.01,
    displayWidth / 2,
    upsHeight / 2 - 0.08 + displayHeight / 2,
    upsDepth / 2 + 0.01,
    -displayWidth / 2,
    upsHeight / 2 - 0.08 + displayHeight / 2,
    upsDepth / 2 + 0.01,
    -displayWidth / 2,
    upsHeight / 2 - 0.08 - displayHeight / 2,
    upsDepth / 2 + 0.01,
  ]);
  displayBorderGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(displayBorderPositions, 3)
  );
  const displayBorderLine = new THREE.LineSegments(
    displayBorderGeometry,
    displayBorderMaterial
  );
  upsGroup.add(displayBorderLine);

  // ===== CONTROL BUTTONS =====
  const buttonMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
  const buttonGeometry = new THREE.CylinderGeometry(0.008, 0.008, 0.005, 8);

  // Power button
  const powerButton = new THREE.Mesh(buttonGeometry, buttonMaterial);
  powerButton.position.set(-0.1, upsHeight / 2 - 0.12, upsDepth / 2 + 0.009);
  powerButton.rotation.x = Math.PI / 2;
  upsGroup.add(powerButton);

  // Reset button
  const resetButton = new THREE.Mesh(buttonGeometry, buttonMaterial);
  resetButton.position.set(-0.05, upsHeight / 2 - 0.12, upsDepth / 2 + 0.009);
  resetButton.rotation.x = Math.PI / 2;
  upsGroup.add(resetButton);

  // ===== STATUS INDICATOR LIGHTS =====
  const ledGeometry = new THREE.CylinderGeometry(0.004, 0.004, 0.003, 8);

  // Battery LED (Orange/Amber)
  const batteryLedMaterial = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
  const batteryLed = new THREE.Mesh(ledGeometry, batteryLedMaterial);
  batteryLed.position.set(0.08, upsHeight / 2 - 0.12, upsDepth / 2 + 0.009);
  batteryLed.rotation.x = Math.PI / 2;
  upsGroup.add(batteryLed);

  // On Battery LED (Red)
  const onBatteryLedMaterial = new THREE.MeshBasicMaterial({
    color: 0xef4444,
  });
  const onBatteryLed = new THREE.Mesh(ledGeometry, onBatteryLedMaterial);
  onBatteryLed.position.set(0.13, upsHeight / 2 - 0.12, upsDepth / 2 + 0.009);
  onBatteryLed.rotation.x = Math.PI / 2;
  upsGroup.add(onBatteryLed);

  // AC Present LED (Green)
  const acLedMaterial = new THREE.MeshBasicMaterial({ color: 0x22c55e });
  const acLed = new THREE.Mesh(ledGeometry, acLedMaterial);
  acLed.position.set(0.03, upsHeight / 2 - 0.12, upsDepth / 2 + 0.009);
  acLed.rotation.x = Math.PI / 2;
  upsGroup.add(acLed);

  // ===== BATTERY COMPARTMENT (visual) =====
  const batteryCompartmentMaterial = new THREE.MeshBasicMaterial({
    color: 0x0a0a0a,
  });
  const batteryCompartmentGeometry = new THREE.BoxGeometry(
    upsWidth * 0.85,
    upsHeight * 0.5,
    0.01
  );
  const batteryCompartmentMesh = new THREE.Mesh(
    batteryCompartmentGeometry,
    batteryCompartmentMaterial
  );
  batteryCompartmentMesh.position.set(0, -upsHeight / 4, upsDepth / 2 + 0.008);
  upsGroup.add(batteryCompartmentMesh);

  // ===== BACK CONNECTOR PANEL =====
  const connectorMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });
  const connectorGeometry = new THREE.BoxGeometry(
    upsWidth * 0.8,
    upsHeight * 0.6,
    0.012
  );
  const connectorMesh = new THREE.Mesh(connectorGeometry, connectorMaterial);
  connectorMesh.position.set(0, -upsHeight / 4, -upsDepth / 2 + 0.007);
  upsGroup.add(connectorMesh);

  // ===== FRONT HANDLE =====
  const handleMaterial = new THREE.MeshBasicMaterial({ color: 0x555555 });
  const handleGeometry = new THREE.BoxGeometry(upsWidth * 0.7, 0.01, 0.01);
  const handleMesh = new THREE.Mesh(handleGeometry, handleMaterial);
  handleMesh.position.set(0, -upsHeight / 2 + 0.012, upsDepth / 2 + 0.01);
  upsGroup.add(handleMesh);

  // ===== EDGE DEFINITION =====
  const edges = new THREE.EdgesGeometry(chassisGeometry);
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x444444 });
  const edgesMesh = new THREE.LineSegments(edges, lineMaterial);
  upsGroup.add(edgesMesh);

  // ===== POSITION CALCULATION =====
  const rackHeight = 42 * uHeight;
  const yOffset = -rackHeight / 2;

  const upsYOffset = yOffset + (position.u - 1 + position.height / 2) * uHeight;

  upsGroup.position.y = upsYOffset;
  upsGroup.position.z = -0.08; // Maju ke depan, lebih jauh dari server

  return upsGroup;
}
