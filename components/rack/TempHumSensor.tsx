"use client";

import * as THREE from "three";

export interface TempHumSensorProps {
  position: { x: number; y: number; z: number };
  label?: string; // "Front" or "Back"
  mqttTopic?: string; // MQTT topic untuk subscribe
  temperature?: number; // Dummy/real temperature
  humidity?: number; // Dummy/real humidity
}

interface SensorDisplay {
  group: THREE.Group;
  updateDisplay: (temp: number, humidity: number) => void;
}

function createDisplayTexture(
  label: string,
  temperature: number = 24.5,
  humidity: number = 65
): THREE.CanvasTexture {
  // Create canvas for texture
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 340; // Taller for vertical display

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  // White background
  ctx.fillStyle = "#f5f5f5";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Border
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);

  // Title
  ctx.fillStyle = "#333333";
  ctx.font = "bold 18px Arial";
  ctx.textAlign = "center";
  ctx.fillText(label, canvas.width / 2, 45);

  // Divider line
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(20, 60);
  ctx.lineTo(canvas.width - 20, 60);
  ctx.stroke();

  // Temperature section
  ctx.fillStyle = "#FF6B6B"; // Red for temp
  ctx.font = "bold 20px Arial";
  ctx.textAlign = "left";
  ctx.fillText("Temp:", 30, 110);

  ctx.fillStyle = "#000000";
  ctx.font = "bold 36px Arial";
  ctx.textAlign = "right";
  ctx.fillText(`${temperature.toFixed(1)}°C`, canvas.width - 30, 115);

  // Humidity section
  ctx.fillStyle = "#4ECDC4"; // Teal for humidity
  ctx.font = "bold 20px Arial";
  ctx.textAlign = "left";
  ctx.fillText("Humidity:", 30, 190);

  ctx.fillStyle = "#000000";
  ctx.font = "bold 36px Arial";
  ctx.textAlign = "right";
  ctx.fillText(`${humidity.toFixed(0)}%`, canvas.width - 30, 195);

  // Bottom info
  ctx.fillStyle = "#666666";
  ctx.font = "12px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Real-time Monitor", canvas.width / 2, canvas.height - 20);

  return new THREE.CanvasTexture(canvas);
}

export function createTempHumSensor(props: TempHumSensorProps): SensorDisplay {
  const {
    position,
    label = "Sensor",
    mqttTopic,
    temperature = 24.5,
    humidity = 65,
  } = props;

  const sensorGroup = new THREE.Group();

  // Sensor dimensions (in relative units, ~110x70x40mm)
  const sensorLength = 0.11; // ~110mm
  const sensorWidth = 0.04; // ~70mm
  const sensorDepth = 0.07; // ~40mm

  // Main body - light gray plastic (visible against dark doors) - VERTICAL orientation
  const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0xcccccc });
  const bodyGeometry = new THREE.BoxGeometry(
    sensorWidth, // width (horizontal)
    sensorLength, // height (vertical - was depth)
    sensorDepth // depth (front-back)
  );
  const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
  sensorGroup.add(bodyMesh);

  // Create display texture with initial data
  const displayTexture = createDisplayTexture(label, temperature, humidity);

  // Display panel - with canvas texture
  const displayMaterial = new THREE.MeshBasicMaterial({
    map: displayTexture,
    side: THREE.FrontSide,
  });
  const displayGeometry = new THREE.BoxGeometry(
    sensorWidth * 0.85,
    sensorLength * 0.85, // vertical display
    0.001
  );
  const displayMesh = new THREE.Mesh(displayGeometry, displayMaterial);
  displayMesh.position.z = sensorDepth / 2 + 0.002;
  sensorGroup.add(displayMesh);

  // Display border - black lines
  const borderMaterial = new THREE.LineBasicMaterial({
    color: 0x000000,
    linewidth: 2,
  });
  const borderGeometry = new THREE.BufferGeometry();
  const borderWidth = sensorWidth * 0.85;
  const borderHeight = sensorLength * 0.85;
  const borderZ = -sensorDepth / 2 - 0.002; // Facing away from mesh grid
  const borderPositions = new Float32Array([
    -borderWidth / 2,
    -borderHeight / 2,
    borderZ,
    borderWidth / 2,
    -borderHeight / 2,
    borderZ,
    borderWidth / 2,
    borderHeight / 2,
    borderZ,
    -borderWidth / 2,
    borderHeight / 2,
    borderZ,
    -borderWidth / 2,
    -borderHeight / 2,
    borderZ,
  ]);
  borderGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(borderPositions, 3)
  );
  const borderLine = new THREE.LineSegments(borderGeometry, borderMaterial);
  sensorGroup.add(borderLine);

  // Mounting brackets (small cylinders on sides)
  const bracketMaterial = new THREE.MeshBasicMaterial({ color: 0x666666 });
  const bracketGeometry = new THREE.CylinderGeometry(0.005, 0.005, 0.003, 8);

  // Left bracket
  const leftBracket = new THREE.Mesh(bracketGeometry, bracketMaterial);
  leftBracket.position.set(
    -sensorWidth / 2 - 0.01,
    sensorLength / 4,
    -sensorDepth / 4
  );
  leftBracket.rotation.z = Math.PI / 2;
  sensorGroup.add(leftBracket);

  // Right bracket
  const rightBracket = new THREE.Mesh(bracketGeometry, bracketMaterial);
  rightBracket.position.set(
    sensorWidth / 2 + 0.01,
    sensorLength / 4,
    -sensorDepth / 4
  );
  rightBracket.rotation.z = Math.PI / 2;
  sensorGroup.add(rightBracket);

  // Position sensor group
  sensorGroup.position.set(position.x, position.y, position.z);

  // Return with update function
  return {
    group: sensorGroup,
    updateDisplay: (temp: number, humidity: number) => {
      const material = displayMesh.material as THREE.MeshBasicMaterial;

      // Dispose old texture
      if (material.map) {
        material.map.dispose();
      }

      // Create and assign new texture
      const newTexture = createDisplayTexture(label, temp, humidity);
      material.map = newTexture;
      material.needsUpdate = true;
    },
  };
}
