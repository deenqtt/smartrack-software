"use client";

import * as THREE from "three";

export interface PDUSideMountProps {
  side: "left" | "right"; // Posisi: left atau right side
  outlets?: number; // Jumlah outlet (default 12)
}

export function createPDUSideMount(props: PDUSideMountProps): THREE.Group {
  const { side, outlets = 6 } = props;
  const pduGroup = new THREE.Group();

  // Rack dimensions
  const uHeight = 0.045;
  const rackWidth = 0.5;
  const rackDepth = 1.2;
  const rackHeight = 42 * uHeight;

  // PDU Side Mount dimensions - vertical strip
  const pduWidth = 0.04; // Narrow strip - dikecilkan
  const pduHeight = rackHeight * 0.7; // 70% of rack height - dikecilkan
  const pduDepth = 0.08; // Protrudes from side - dikecilkan

  // ===== MAIN HOUSING =====
  const housingMaterial = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
  const housingGeometry = new THREE.BoxGeometry(pduWidth, pduHeight, pduDepth);
  const housingMesh = new THREE.Mesh(housingGeometry, housingMaterial);
  pduGroup.add(housingMesh);

  // ===== FRONT PANEL =====
  const panelMaterial = new THREE.MeshBasicMaterial({ color: 0x2a2a2a });
  const panelGeometry = new THREE.BoxGeometry(
    pduWidth * 0.9,
    pduHeight * 0.95,
    0.012
  );
  const panelMesh = new THREE.Mesh(panelGeometry, panelMaterial);
  panelMesh.position.z = pduDepth / 2 + 0.006;
  pduGroup.add(panelMesh);

  // ===== POWER OUTLETS (vertical arrangement) =====
  const outletMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
  const outletSize = 0.009; // Lebih kecil
  const outletSpacing = (pduHeight * 0.8) / (outlets + 1);

  for (let i = 0; i < outlets; i++) {
    const outletGeometry = new THREE.BoxGeometry(
      outletSize * 0.8,
      outletSize,
      0.006
    );
    const outletMesh = new THREE.Mesh(outletGeometry, outletMaterial);

    const yPos = pduHeight * 0.35 - (i + 1) * outletSpacing;
    outletMesh.position.set(0, yPos, pduDepth / 2 + 0.005);
    pduGroup.add(outletMesh);
  }

  // ===== STATUS LEDs (vertical strip on top) =====
  const ledGeometry = new THREE.CylinderGeometry(0.003, 0.003, 0.002, 8);

  // Power LED
  const powerLedMaterial = new THREE.MeshBasicMaterial({ color: 0x22c55e });
  const powerLed = new THREE.Mesh(ledGeometry, powerLedMaterial);
  powerLed.position.set(0, pduHeight / 2 - 0.015, pduDepth / 2 + 0.008);
  powerLed.rotation.x = Math.PI / 2;
  pduGroup.add(powerLed);

  // Overload LED
  const overloadLedMaterial = new THREE.MeshBasicMaterial({
    color: 0xef4444,
  });
  const overloadLed = new THREE.Mesh(ledGeometry, overloadLedMaterial);
  overloadLed.position.set(0, pduHeight / 2 - 0.022, pduDepth / 2 + 0.008);
  overloadLed.rotation.x = Math.PI / 2;
  pduGroup.add(overloadLed);

  // ===== CABLE CONNECTOR (back top) =====
  const connectorMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });
  const connectorGeometry = new THREE.BoxGeometry(pduWidth * 0.6, 0.03, 0.01);
  const connectorMesh = new THREE.Mesh(connectorGeometry, connectorMaterial);
  connectorMesh.position.set(0, pduHeight / 2 - 0.02, -pduDepth / 2 + 0.005);
  pduGroup.add(connectorMesh);

  // ===== MOUNTING BRACKETS =====
  const bracketMaterial = new THREE.MeshBasicMaterial({ color: 0x555555 });
  const bracketGeometry = new THREE.BoxGeometry(pduWidth, 0.015, 0.025);

  // Top bracket
  const topBracket = new THREE.Mesh(bracketGeometry, bracketMaterial);
  topBracket.position.set(0, pduHeight / 2, pduDepth / 2 + 0.01);
  pduGroup.add(topBracket);

  // Bottom bracket
  const bottomBracket = new THREE.Mesh(bracketGeometry, bracketMaterial);
  bottomBracket.position.set(0, -pduHeight / 2, pduDepth / 2 + 0.01);
  pduGroup.add(bottomBracket);

  // ===== EDGE DEFINITION =====
  const edges = new THREE.EdgesGeometry(housingGeometry);
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x333333 });
  const edgesMesh = new THREE.LineSegments(edges, lineMaterial);
  pduGroup.add(edgesMesh);

  // ===== POSITION CALCULATION =====
  const yOffset = -rackHeight / 2;
  const centerY = yOffset + rackHeight / 2;

  // Position left or right side
  let xPos = 0;
  let zPos = 0;

  if (side === "left") {
    xPos = -rackWidth / 2 - pduWidth / 2 + 0.05; // Left side, slightly protruding
    zPos = rackDepth / 2 - 0.1; // Near front
  } else {
    xPos = rackWidth / 2 + pduWidth / 2 - 0.05; // Right side, slightly protruding
    zPos = rackDepth / 2 - 0.1; // Near front
  }

  pduGroup.position.set(xPos, centerY, zPos);

  return pduGroup;
}
