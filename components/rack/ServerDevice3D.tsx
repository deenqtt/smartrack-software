"use client";

// Dynamically import THREE to enable tree shaking
// THREE.js is only loaded when 3D components are actually used

export interface ServerDevice3DProps {
  position: { u: number; height: number }; // U position and height in U units
  name?: string;
  status?: "online" | "offline" | "warning";
}

export async function createServerDevice3D(props: ServerDevice3DProps): Promise<any> {
  // Dynamic import of THREE.js for tree shaking
  const THREE = await import('three');

  const { position } = props;
  const serverGroup = new THREE.Group();

  // Rack dimensions from RackVisualization
  const uHeight = 0.045;
  const rackWidth = 0.4; // Slightly smaller to fit inside rails

  // Server dimensions for 2U
  const serverWidth = rackWidth;
  const serverHeight = position.height * uHeight - 0.003; // 2U height with small gap
  const serverDepth = 0.8; // Server depth

  // Status colors
  const STATUS_COLORS: { [key: string]: number } = {
    online: 0x22c55e, // Green
    offline: 0xef4444, // Red
    warning: 0xf59e0b, // Amber
  };

  const baseColor = STATUS_COLORS[props.status || "online"] || 0x3b82f6;

  // ===== MAIN CHASSIS BODY =====
  const chassisMaterial = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
  const chassisGeometry = new THREE.BoxGeometry(
    serverWidth,
    serverHeight,
    serverDepth
  );
  const chassisMesh = new THREE.Mesh(chassisGeometry, chassisMaterial);
  serverGroup.add(chassisMesh);

  // ===== FRONT BEZEL =====
  const bezelMaterial = new THREE.MeshBasicMaterial({ color: 0x2a2a2a });
  const bezelGeometry = new THREE.BoxGeometry(
    serverWidth * 0.95,
    serverHeight * 0.9,
    0.015
  );
  const bezelMesh = new THREE.Mesh(bezelGeometry, bezelMaterial);
  bezelMesh.position.z = serverDepth / 2 + 0.008;
  serverGroup.add(bezelMesh);

  // ===== STATUS INDICATOR LIGHTS =====
  const ledPositionY = serverHeight / 2 - 0.015;
  const ledPositionZ = -serverDepth / 2 - 0.018; // LED di depan, lebih visible

  // Power LED
  const powerLedMaterial = new THREE.MeshBasicMaterial({ color: baseColor });
  const ledGeometry = new THREE.CylinderGeometry(0.006, 0.006, 0.003, 8);
  const powerLed = new THREE.Mesh(ledGeometry, powerLedMaterial);
  powerLed.position.set(-0.12, ledPositionY, ledPositionZ);
  powerLed.rotation.x = Math.PI / 2;
  serverGroup.add(powerLed);

  // Status LED (secondary indicator)
  const statusLedMaterial = new THREE.MeshBasicMaterial({
    color: baseColor === 0x22c55e ? 0x3b82f6 : 0xcccccc,
  });
  const statusLed = new THREE.Mesh(ledGeometry, statusLedMaterial);
  statusLed.position.set(-0.065, ledPositionY, ledPositionZ);
  statusLed.rotation.x = Math.PI / 2;
  serverGroup.add(statusLed);

  // ===== FRONT HANDLE =====
  const handleMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });
  const handleGeometry = new THREE.BoxGeometry(serverWidth * 0.8, 0.008, 0.008);
  const handleMesh = new THREE.Mesh(handleGeometry, handleMaterial);
  handleMesh.position.set(0, -serverHeight / 2 + 0.01, serverDepth / 2 + 0.01);
  serverGroup.add(handleMesh);

  // ===== DRIVE BAYS (visual elements) =====
  const driveBayColor = 0x0a0a0a;
  const driveSpacing = serverHeight / 6;
  const numDriveBays = 3;

  for (let i = 0; i < numDriveBays; i++) {
    const driveMaterial = new THREE.MeshBasicMaterial({ color: driveBayColor });
    const driveGeometry = new THREE.BoxGeometry(
      serverWidth * 0.85,
      serverHeight / 5,
      0.01
    );
    const driveMesh = new THREE.Mesh(driveGeometry, driveMaterial);

    const yPos =
      serverHeight / 2 - 0.02 - (i * driveSpacing + serverHeight / 10);
    driveMesh.position.set(0, yPos, serverDepth / 2 + 0.009);
    serverGroup.add(driveMesh);

    // Drive slot details (beveled lines)
    const slotMaterial = new THREE.LineBasicMaterial({
      color: 0x333333,
      linewidth: 1,
    });
    const slotGeometry = new THREE.BufferGeometry();
    const slotWidth = serverWidth * 0.85;
    const slotHeight = serverHeight / 5;
    const slotPositions = new Float32Array([
      -slotWidth / 2,
      yPos - slotHeight / 2,
      serverDepth / 2 + 0.01,
      slotWidth / 2,
      yPos - slotHeight / 2,
      serverDepth / 2 + 0.01,
      slotWidth / 2,
      yPos + slotHeight / 2,
      serverDepth / 2 + 0.01,
      -slotWidth / 2,
      yPos + slotHeight / 2,
      serverDepth / 2 + 0.01,
      -slotWidth / 2,
      yPos - slotHeight / 2,
      serverDepth / 2 + 0.01,
    ]);
    slotGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(slotPositions, 3)
    );
    const slotLine = new THREE.LineSegments(slotGeometry, slotMaterial);
    serverGroup.add(slotLine);
  }

  // ===== REAR COOLING FANS (visual) =====
  const fanMaterial = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
  const fanGeometry = new THREE.BoxGeometry(
    serverWidth * 0.3,
    serverHeight * 0.4,
    0.02
  );
  const rearFan = new THREE.Mesh(fanGeometry, fanMaterial);
  rearFan.position.set(0, 0, -serverDepth / 2 - 0.01);
  serverGroup.add(rearFan);

  // ===== CABLE CONNECTORS (back panel) =====
  const connectorMaterial = new THREE.MeshBasicMaterial({ color: 0x555555 });
  const connectorGeometry = new THREE.BoxGeometry(
    serverWidth * 0.7,
    serverHeight * 0.15,
    0.008
  );
  const connectorMesh = new THREE.Mesh(connectorGeometry, connectorMaterial);
  connectorMesh.position.set(
    0,
    -serverHeight / 2 + 0.02,
    -serverDepth / 2 + 0.006
  );
  serverGroup.add(connectorMesh);

  // ===== EDGE DEFINITION =====
  const edges = new THREE.EdgesGeometry(chassisGeometry);
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x444444 });
  const edgesMesh = new THREE.LineSegments(edges, lineMaterial);
  serverGroup.add(edgesMesh);

  // ===== POSITION CALCULATION =====
  // U position: bottom of server at U1 means it starts at U1
  // Height: 2U means it spans 2 U units
  const rackHeight = 42 * uHeight;
  const yOffset = -rackHeight / 2; // Same offset as rack frame (sepenuhnya di atas Y=0)

  const serverYOffset =
    yOffset + (position.u - 1 + position.height / 2) * uHeight;

  serverGroup.position.y = serverYOffset;
  serverGroup.position.z = -0.1; // Maju ke depan (negative Z)

  return serverGroup;
}
