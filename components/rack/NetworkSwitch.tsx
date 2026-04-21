"use client";

import * as THREE from "three";

export interface NetworkSwitchProps {
  position: { u: number }; // U position (1U height)
  ports?: number; // 24 or 48 ports (default 24)
  brand?: string; // e.g., "Cisco", "Arista", "Dell"
}

export function createNetworkSwitch(props: NetworkSwitchProps): THREE.Group {
  const { position, ports = 24 } = props;
  const switchGroup = new THREE.Group();

  // Rack dimensions
  const uHeight = 0.045;
  const rackWidth = 0.38;

  // Switch 1U dimensions
  const switchWidth = rackWidth;
  const switchHeight = 1 * uHeight - 0.003; // 1U height
  const switchDepth = 0.65; // Standard switch depth

  // ===== MAIN CHASSIS =====
  const chassisMaterial = new THREE.MeshBasicMaterial({ color: 0x0a0a0a });
  const chassisGeometry = new THREE.BoxGeometry(
    switchWidth,
    switchHeight,
    switchDepth
  );
  const chassisMesh = new THREE.Mesh(chassisGeometry, chassisMaterial);
  switchGroup.add(chassisMesh);

  // ===== FRONT BEZEL =====
  const bezelMaterial = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
  const bezelGeometry = new THREE.BoxGeometry(
    switchWidth * 0.95,
    switchHeight * 0.9,
    0.012
  );
  const bezelMesh = new THREE.Mesh(bezelGeometry, bezelMaterial);
  bezelMesh.position.z = switchDepth / 2 + 0.006;
  switchGroup.add(bezelMesh);

  // ===== NETWORK PORTS =====
  const portMaterial = new THREE.MeshBasicMaterial({ color: 0x1a3a52 });
  const portSize = 0.008;
  const portSpacing = (switchWidth * 0.85) / (ports + 1);

  for (let i = 0; i < ports; i++) {
    const portGeometry = new THREE.BoxGeometry(portSize, portSize * 0.6, 0.008);
    const portMesh = new THREE.Mesh(portGeometry, portMaterial);

    const xPos = -switchWidth * 0.425 + (i + 1) * portSpacing;
    portMesh.position.set(
      xPos,
      -switchHeight / 2 + 0.008,
      switchDepth / 2 + 0.007
    );
    switchGroup.add(portMesh);

    // Port LED status indicator (small dot above port)
    const portLedColors = [0x22c55e, 0xf59e0b, 0xef4444]; // Green, Amber, Red
    const randomLedColor =
      portLedColors[Math.floor(Math.random() * portLedColors.length)];

    const portLedMaterial = new THREE.MeshBasicMaterial({
      color: randomLedColor,
    });
    const portLedGeometry = new THREE.CylinderGeometry(0.002, 0.002, 0.001, 8);
    const portLed = new THREE.Mesh(portLedGeometry, portLedMaterial);
    portLed.position.set(
      xPos,
      -switchHeight / 2 + 0.015,
      switchDepth / 2 + 0.008
    );
    portLed.rotation.x = Math.PI / 2;
    switchGroup.add(portLed);
  }

  // ===== MANAGEMENT PORT SECTION =====
  const mgmtSectionMaterial = new THREE.MeshBasicMaterial({ color: 0x2a2a2a });
  const mgmtSectionGeometry = new THREE.BoxGeometry(
    switchWidth * 0.2,
    switchHeight * 0.6,
    0.01
  );
  const mgmtSectionMesh = new THREE.Mesh(
    mgmtSectionGeometry,
    mgmtSectionMaterial
  );
  mgmtSectionMesh.position.set(
    switchWidth / 2 - 0.04,
    0,
    switchDepth / 2 + 0.007
  );
  switchGroup.add(mgmtSectionMesh);

  // Management console port (USB/Serial)
  const consoleMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
  const consoleGeometry = new THREE.BoxGeometry(0.008, 0.006, 0.008);
  const consoleMesh = new THREE.Mesh(consoleGeometry, consoleMaterial);
  consoleMesh.position.set(
    switchWidth / 2 - 0.045,
    switchHeight / 2 - 0.01,
    switchDepth / 2 + 0.008
  );
  switchGroup.add(consoleMesh);

  // ===== STATUS INDICATOR LIGHTS =====
  const ledGeometry = new THREE.CylinderGeometry(0.003, 0.003, 0.002, 8);

  // System LED (Green)
  const systemLedMaterial = new THREE.MeshBasicMaterial({ color: 0x22c55e });
  const systemLed = new THREE.Mesh(ledGeometry, systemLedMaterial);
  systemLed.position.set(
    -0.15,
    switchHeight / 2 - 0.008,
    switchDepth / 2 + 0.008
  );
  systemLed.rotation.x = Math.PI / 2;
  switchGroup.add(systemLed);

  // Link Status LED (Amber)
  const linkLedMaterial = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
  const linkLed = new THREE.Mesh(ledGeometry, linkLedMaterial);
  linkLed.position.set(
    -0.12,
    switchHeight / 2 - 0.008,
    switchDepth / 2 + 0.008
  );
  linkLed.rotation.x = Math.PI / 2;
  switchGroup.add(linkLed);

  // Activity LED (Blue)
  const activityLedMaterial = new THREE.MeshBasicMaterial({ color: 0x3b82f6 });
  const activityLed = new THREE.Mesh(ledGeometry, activityLedMaterial);
  activityLed.position.set(
    -0.09,
    switchHeight / 2 - 0.008,
    switchDepth / 2 + 0.008
  );
  activityLed.rotation.x = Math.PI / 2;
  switchGroup.add(activityLed);

  // ===== COOLING FANS (back) =====
  const fanMaterial = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
  const fanGeometry = new THREE.BoxGeometry(
    switchWidth * 0.4,
    switchHeight * 0.7,
    0.015
  );
  const fanMesh = new THREE.Mesh(fanGeometry, fanMaterial);
  fanMesh.position.set(0, 0, -switchDepth / 2 - 0.008);
  switchGroup.add(fanMesh);

  // Fan grills visualization
  const fanGrillMaterial = new THREE.LineBasicMaterial({
    color: 0x444444,
    linewidth: 1,
  });
  const gridSpacing = 0.015;
  for (let x = -switchWidth * 0.15; x < switchWidth * 0.15; x += gridSpacing) {
    for (
      let y = -switchHeight * 0.25;
      y < switchHeight * 0.25;
      y += gridSpacing
    ) {
      const dotGeometry = new THREE.CylinderGeometry(0.001, 0.001, 0.001, 4);
      const dotMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
      const dot = new THREE.Mesh(dotGeometry, dotMaterial);
      dot.position.set(x, y, -switchDepth / 2 - 0.009);
      switchGroup.add(dot);
    }
  }

  // ===== BACK CONNECTOR PANEL =====
  const backPanelMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });
  const backPanelGeometry = new THREE.BoxGeometry(
    switchWidth * 0.85,
    switchHeight * 0.4,
    0.01
  );
  const backPanelMesh = new THREE.Mesh(backPanelGeometry, backPanelMaterial);
  backPanelMesh.position.set(
    0,
    switchHeight / 2 - 0.01,
    -switchDepth / 2 + 0.005
  );
  switchGroup.add(backPanelMesh);

  // Power connector
  const powerConnectorGeometry = new THREE.BoxGeometry(0.02, 0.015, 0.008);
  const powerConnectorMaterial = new THREE.MeshBasicMaterial({
    color: 0x555555,
  });
  const powerConnectorMesh = new THREE.Mesh(
    powerConnectorGeometry,
    powerConnectorMaterial
  );
  powerConnectorMesh.position.set(
    switchWidth / 2 - 0.06,
    switchHeight / 2 - 0.01,
    -switchDepth / 2 + 0.006
  );
  switchGroup.add(powerConnectorMesh);

  // ===== EDGE DEFINITION =====
  const edges = new THREE.EdgesGeometry(chassisGeometry);
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x333333 });
  const edgesMesh = new THREE.LineSegments(edges, lineMaterial);
  switchGroup.add(edgesMesh);

  // ===== POSITION CALCULATION =====
  const rackHeight = 42 * 0.045;
  const yOffset = -rackHeight / 2;

  const switchYOffset = yOffset + (position.u - 1 + 0.5) * uHeight; // Center of 1U

  switchGroup.position.y = switchYOffset;
  switchGroup.position.z = -0.16; // Maju ke depan

  return switchGroup;
}
