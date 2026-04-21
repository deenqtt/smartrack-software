"use client";

import * as THREE from "three";

export interface PDURackMountProps {
  position: { u: number }; // U position (1U height)
}

export function createPDURackMount(props: PDURackMountProps): THREE.Group {
  const { position } = props;
  const pduGroup = new THREE.Group();

  // Rack dimensions
  const uHeight = 0.045;
  const rackWidth = 0.36;

  // PDU 1U dimensions
  const pduWidth = rackWidth;
  const pduHeight = 1 * uHeight - 0.003; // 1U height with small gap
  const pduDepth = 0.6; // Shallower than server

  // ===== MAIN CHASSIS =====
  const chassisMaterial = new THREE.MeshBasicMaterial({ color: 0x0f0f0f });
  const chassisGeometry = new THREE.BoxGeometry(pduWidth, pduHeight, pduDepth);
  const chassisMesh = new THREE.Mesh(chassisGeometry, chassisMaterial);
  pduGroup.add(chassisMesh);

  // ===== FRONT PANEL =====
  const panelMaterial = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
  const panelGeometry = new THREE.BoxGeometry(
    pduWidth * 0.95,
    pduHeight * 0.9,
    0.012
  );
  const panelMesh = new THREE.Mesh(panelGeometry, panelMaterial);
  panelMesh.position.z = pduDepth / 2 + 0.006;
  pduGroup.add(panelMesh);

  // ===== POWER OUTLETS =====
  const outletMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
  const outletSize = 0.012;
  const numOutlets = 8;
  const outletSpacing = (pduWidth * 0.8) / (numOutlets + 1);

  for (let i = 0; i < numOutlets; i++) {
    const outletGeometry = new THREE.BoxGeometry(outletSize, outletSize, 0.008);
    const outletMesh = new THREE.Mesh(outletGeometry, outletMaterial);

    const xPos = -pduWidth * 0.4 + (i + 1) * outletSpacing;
    outletMesh.position.set(xPos, 0, pduDepth / 2 + 0.008);
    pduGroup.add(outletMesh);
  }

  // ===== STATUS LEDS =====
  const ledGeometry = new THREE.CylinderGeometry(0.003, 0.003, 0.002, 8);

  // Power On LED (Green)
  const powerOnLedMaterial = new THREE.MeshBasicMaterial({ color: 0x22c55e });
  const powerOnLed = new THREE.Mesh(ledGeometry, powerOnLedMaterial);
  powerOnLed.position.set(-0.15, pduHeight / 2 - 0.008, pduDepth / 2 + 0.008);
  powerOnLed.rotation.x = Math.PI / 2;
  pduGroup.add(powerOnLed);

  // Overload LED (Red)
  const overloadLedMaterial = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  const overloadLed = new THREE.Mesh(ledGeometry, overloadLedMaterial);
  overloadLed.position.set(-0.13, pduHeight / 2 - 0.008, pduDepth / 2 + 0.008);
  overloadLed.rotation.x = Math.PI / 2;
  pduGroup.add(overloadLed);

  // ===== CABLE ENTRY POINT (back) =====
  const cableConnectorMaterial = new THREE.MeshBasicMaterial({
    color: 0x444444,
  });
  const cableConnectorGeometry = new THREE.BoxGeometry(
    pduWidth * 0.3,
    pduHeight * 0.5,
    0.01
  );
  const cableConnectorMesh = new THREE.Mesh(
    cableConnectorGeometry,
    cableConnectorMaterial
  );
  cableConnectorMesh.position.set(0, 0, -pduDepth / 2 + 0.005);
  pduGroup.add(cableConnectorMesh);

  // ===== EDGE DEFINITION =====
  const edges = new THREE.EdgesGeometry(chassisGeometry);
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x333333 });
  const edgesMesh = new THREE.LineSegments(edges, lineMaterial);
  pduGroup.add(edgesMesh);

  // ===== POSITION CALCULATION =====
  const rackHeight = 42 * uHeight;
  const yOffset = -rackHeight / 2;

  const pduYOffset = yOffset + (position.u - 1 + 0.5) * uHeight; // Center of 1U

  pduGroup.position.y = pduYOffset;
  pduGroup.position.z = -0.23; // Maju ke depan

  return pduGroup;
}
