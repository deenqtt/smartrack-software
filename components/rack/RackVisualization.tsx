"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface RackServer {
  id: string;
  name: string;
  type: 'server' | 'pdu' | 'blank' | 'pdu-rail' | 'pdu-side' | 'ups' | 'switch';
  position: number;
  height: number;
  status?: 'online' | 'offline' | 'warning';
  topics?: { [key: string]: string };
  deviceType?: string;
  side?: 'left' | 'right';
  outlets?: number;
  ports?: number;
}
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { createTempHumSensor } from "./TempHumSensor";
import { createServerDevice3D } from "./ServerDevice3D";
import { createPDURackMount } from "./PDURackMount";
import { createUPS } from "./UPS";
import { createPDUSideMount } from "./PDUSideMount";
import { createNetworkSwitch } from "./NetworkSwitch";
import { useMqtt } from "@/contexts/MqttContext";

interface RackVisualizationProps {
  servers: RackServer[];
  selectedServerId?: string;
  onServerSelect: (server: RackServer) => void;
  frontTopic?: string;
  backTopic?: string;
  rackNumber?: number;
}

const SERVER_TYPE_COLORS: { [key: string]: number } = {
  server: 0x3b82f6, // Blue
  pdu: 0xeab308, // Yellow
  blank: 0x9ca3af, // Gray
};

const STATUS_COLORS: { [key: string]: number } = {
  online: 0x22c55e, // Green
  offline: 0xef4444, // Red
  warning: 0xf59e0b, // Amber
};

export default function RackVisualization({
  servers,
  selectedServerId,
  onServerSelect,
  frontTopic,
  backTopic,
  rackNumber,
}: RackVisualizationProps) {
  const { subscribe } = useMqtt();
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const serverMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const frontDoorRef = useRef<THREE.Group | null>(null);
  const backDoorRef = useRef<THREE.Group | null>(null);
  const doorsOpenRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Get container dimensions with fallback
    const width = container.clientWidth || window.innerWidth;
    const height =
      container.clientHeight || window.innerHeight * 0.7;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);
    scene.fog = new THREE.Fog(0xf5f5f5, 100, 500);
    sceneRef.current = scene;

    // Camera - positioned in front of front door with slight angle
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    // Rack height calculations
    const uHeight = 0.045;
    const rackHeight = 42 * uHeight; // ~1.89 meters
    const yOffset = -rackHeight / 2;
    const rackCenterY = rackHeight / 2 + yOffset; // Tengah rack dengan offset

    // Position: di depan front door (Z negatif), sedikit ke atas dan ke samping
    camera.position.set(0.8, rackCenterY + 0.2, -3.5);
    camera.lookAt(0, rackCenterY, 0);
    cameraRef.current = camera;

    // Renderer - Low res optimization
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = false;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting - Minimal (for MeshBasicMaterial, not needed but keeps atmosphere)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = false;
    controls.enablePan = true;
    controls.enableZoom = true;

    // Create Rack Frame (simple: 4 sides + 2 doors for 42U)
    const createRackFrame = () => {
      const group = new THREE.Group();

      // Rack dimensions
      const rackWidth = 0.5; // 19" standard
      const rackDepth = 1.2;
      const uHeight = 0.045; // 42U = 1.89m high
      const rackHeight = 42 * uHeight;
      const thickness = 0.015;

      // Offset rack agar sepenuhnya di atas Y=0 (ground level)
      const yOffset = -rackHeight / 2;

      // Colors
      const blackMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
      const darkGrayMaterial = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });

      // Helper function to create box panels
      const createBox = (
        w: number,
        h: number,
        d: number,
        x: number,
        y: number,
        z: number,
        mat: THREE.Material
      ) => {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        return mesh;
      };

      // ===== 42U RACK STRUCTURE =====

      // LEFT PANEL (vertical, full height)
      const leftPanel = createBox(
        thickness,
        rackHeight,
        rackDepth,
        -rackWidth / 2,
        rackHeight / 2 + yOffset,
        0,
        blackMaterial
      );
      group.add(leftPanel);

      // RIGHT PANEL (vertical, full height)
      const rightPanel = createBox(
        thickness,
        rackHeight,
        rackDepth,
        rackWidth / 2,
        rackHeight / 2 + yOffset,
        0,
        blackMaterial
      );
      group.add(rightPanel);

      // Helper to create perforated door with grid pattern
      const createPerforatedDoor = (
        w: number,
        h: number,
        d: number,
        x: number,
        y: number,
        z: number,
        frameColor: number
      ) => {
        const doorGroup = new THREE.Group();

        // Main door frame (transparent with edge frame)
        const frameMaterial = new THREE.MeshBasicMaterial({
          color: frameColor,
          transparent: true,
          opacity: 0.2, // Very transparent so you can see through
        });
        const frameGeometry = new THREE.BoxGeometry(w, h, d);
        const frameMesh = new THREE.Mesh(frameGeometry, frameMaterial);
        frameMesh.position.set(x, y, z);
        doorGroup.add(frameMesh);

        // Create grid pattern (jaring-jaring mesh) using lines
        const gridMaterial = new THREE.LineBasicMaterial({
          color: 0x555555,
          linewidth: 2,
        });
        const gridSpacing = 0.06; // Grid spacing for holes

        // Vertical lines
        for (
          let hPos = -w / 2 + gridSpacing;
          hPos < w / 2;
          hPos += gridSpacing
        ) {
          const vertGeometry = new THREE.BufferGeometry();
          const vertPositions = new Float32Array([
            hPos,
            -h / 2,
            z,
            hPos,
            h / 2,
            z,
          ]);
          vertGeometry.setAttribute(
            "position",
            new THREE.BufferAttribute(vertPositions, 3)
          );
          const vertLine = new THREE.Line(vertGeometry, gridMaterial);
          vertLine.position.set(x, y, 0);
          doorGroup.add(vertLine);
        }

        // Horizontal lines
        for (
          let vPos = -h / 2 + gridSpacing;
          vPos < h / 2;
          vPos += gridSpacing
        ) {
          const horizGeometry = new THREE.BufferGeometry();
          const horizPositions = new Float32Array([
            -w / 2,
            vPos,
            z,
            w / 2,
            vPos,
            z,
          ]);
          horizGeometry.setAttribute(
            "position",
            new THREE.BufferAttribute(horizPositions, 3)
          );
          const horizLine = new THREE.Line(horizGeometry, gridMaterial);
          horizLine.position.set(x, y, 0);
          doorGroup.add(horizLine);
        }

        // Add frame border (edges) - thick black lines
        const borderMaterial = new THREE.LineBasicMaterial({
          color: 0x000000,
          linewidth: 2,
        });
        const borderGeometry = new THREE.BufferGeometry();
        const borderPositions = new Float32Array([
          -w / 2,
          -h / 2,
          z,
          w / 2,
          -h / 2,
          z,
          w / 2,
          h / 2,
          z,
          -w / 2,
          h / 2,
          z,
          -w / 2,
          -h / 2,
          z,
        ]);
        borderGeometry.setAttribute(
          "position",
          new THREE.BufferAttribute(borderPositions, 3)
        );
        const borderLine = new THREE.LineSegments(
          borderGeometry,
          borderMaterial
        );
        borderLine.position.set(x, y, 0);
        doorGroup.add(borderLine);

        // Add divider lines (horizontal + vertical) - black thick lines
        const dividerMaterial = new THREE.LineBasicMaterial({
          color: 0x000000,
          linewidth: 3,
        });

        // ===== HORIZONTAL DIVIDERS (3 lines) =====
        // Top divider
        const topDividerGeometry = new THREE.BufferGeometry();
        const topDividerPositions = new Float32Array([
          -w / 2,
          h / 2 - 0.3,
          z,
          w / 2,
          h / 2 - 0.3,
          z,
        ]);
        topDividerGeometry.setAttribute(
          "position",
          new THREE.BufferAttribute(topDividerPositions, 3)
        );
        const topDivider = new THREE.Line(topDividerGeometry, dividerMaterial);
        topDivider.position.set(x, y, 0);
        doorGroup.add(topDivider);

        // Middle divider
        const midDividerGeometry = new THREE.BufferGeometry();
        const midDividerPositions = new Float32Array([
          -w / 2,
          0,
          z,
          w / 2,
          0,
          z,
        ]);
        midDividerGeometry.setAttribute(
          "position",
          new THREE.BufferAttribute(midDividerPositions, 3)
        );
        const midDivider = new THREE.Line(midDividerGeometry, dividerMaterial);
        midDivider.position.set(x, y, 0);
        doorGroup.add(midDivider);

        // Bottom divider
        const botDividerGeometry = new THREE.BufferGeometry();
        const botDividerPositions = new Float32Array([
          -w / 2,
          -h / 2 + 0.3,
          z,
          w / 2,
          -h / 2 + 0.3,
          z,
        ]);
        botDividerGeometry.setAttribute(
          "position",
          new THREE.BufferAttribute(botDividerPositions, 3)
        );
        const botDivider = new THREE.Line(botDividerGeometry, dividerMaterial);
        botDivider.position.set(x, y, 0);
        doorGroup.add(botDivider);

        // ===== VERTICAL DIVIDERS (2 lines - left and right, closer to edges) =====
        // Left vertical divider
        const leftVertGeometry = new THREE.BufferGeometry();
        const leftVertPositions = new Float32Array([
          -w / 2,
          -h / 2,
          z,
          -w / 2,
          h / 2,
          z,
        ]);
        leftVertGeometry.setAttribute(
          "position",
          new THREE.BufferAttribute(leftVertPositions, 3)
        );
        const leftVert = new THREE.Line(leftVertGeometry, dividerMaterial);
        leftVert.position.set(x, y, 0);
        doorGroup.add(leftVert);

        // Right vertical divider
        const rightVertGeometry = new THREE.BufferGeometry();
        const rightVertPositions = new Float32Array([
          w / 2,
          -h / 2,
          z,
          w / 2,
          h / 2,
          z,
        ]);
        rightVertGeometry.setAttribute(
          "position",
          new THREE.BufferAttribute(rightVertPositions, 3)
        );
        const rightVert = new THREE.Line(rightVertGeometry, dividerMaterial);
        rightVert.position.set(x, y, 0);
        doorGroup.add(rightVert);

        return doorGroup;
      };

      // FRONT DOOR (as rotatable group with hinge on left)
      const frontDoorGroup = new THREE.Group();
      frontDoorGroup.position.set(-rackWidth / 2, yOffset, -rackDepth / 2);
      const frontDoorMesh = createPerforatedDoor(
        rackWidth + thickness,
        rackHeight,
        thickness,
        rackWidth / 2,
        rackHeight / 2,
        thickness / 2,
        0x000000 // Black color for front door
      );
      frontDoorGroup.add(frontDoorMesh);
      frontDoorRef.current = frontDoorGroup;
      group.add(frontDoorGroup);

      // BACK DOOR (as rotatable group with hinge on right)
      const backDoorGroup = new THREE.Group();
      backDoorGroup.position.set(rackWidth / 2, yOffset, rackDepth / 2);
      const backDoorMesh = createPerforatedDoor(
        rackWidth + thickness,
        rackHeight,
        thickness,
        -rackWidth / 2,
        rackHeight / 2,
        -thickness / 2,
        0x1a1a1a // Dark gray color for back door
      );
      backDoorGroup.add(backDoorMesh);
      backDoorRef.current = backDoorGroup;
      group.add(backDoorGroup);

      // TOP (cap)
      const topPanel = createBox(
        rackWidth + thickness * 2,
        thickness,
        rackDepth,
        0,
        rackHeight + yOffset,
        0,
        blackMaterial
      );
      group.add(topPanel);

      // BOTTOM (cap)
      const bottomPanel = createBox(
        rackWidth + thickness * 2,
        thickness,
        rackDepth,
        0,
        yOffset,
        0,
        blackMaterial
      );
      group.add(bottomPanel);

      // ===== MOUNT RAILS (42U with holes) =====
      const railWidth = 0.03;
      const railDepth = 0.02;
      const railMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });
      const railLeftX = -rackWidth / 2 + 0.05;
      const railRightX = rackWidth / 2 - 0.05;
      const railZ = -rackDepth / 2 + 0.08;

      // Left mount rail
      const leftRailGeometry = new THREE.BoxGeometry(
        railWidth,
        rackHeight,
        railDepth
      );
      const leftRail = new THREE.Mesh(leftRailGeometry, railMaterial);
      leftRail.position.set(railLeftX, rackHeight / 2 + yOffset, railZ);
      group.add(leftRail);

      // Right mount rail
      const rightRailGeometry = new THREE.BoxGeometry(
        railWidth,
        rackHeight,
        railDepth
      );
      const rightRail = new THREE.Mesh(rightRailGeometry, railMaterial);
      rightRail.position.set(railRightX, rackHeight / 2 + yOffset, railZ);
      group.add(rightRail);

      // Add holes/slots on the rails (42U positions) - as visible 3D cylinders
      const holeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const holeRadius = 0.005;

      for (let u = 1; u <= 42; u++) {
        // Y position: bottom of each U (U1 starts at bottom of rack)
        const holeY = (u - 1) * uHeight + 0.3 * uHeight;
        // Relative to rail object (which is centered at rackHeight/2)
        const holeYRelative = holeY - rackHeight / 2;

        // Left rail hole (1 hole per U position)
        const leftHoleGeometry = new THREE.CylinderGeometry(
          holeRadius,
          holeRadius,
          0.015,
          8
        );
        const leftHole = new THREE.Mesh(leftHoleGeometry, holeMaterial);
        leftHole.position.set(0, holeYRelative, 0);
        leftHole.rotation.z = Math.PI / 2; // Rotate to face outward
        leftRail.add(leftHole);

        // Right rail hole (1 hole per U position)
        const rightHoleGeometry = new THREE.CylinderGeometry(
          holeRadius,
          holeRadius,
          0.015,
          8
        );
        const rightHole = new THREE.Mesh(rightHoleGeometry, holeMaterial);
        rightHole.position.set(0, holeYRelative, 0);
        rightHole.rotation.z = Math.PI / 2; // Rotate to face outward
        rightRail.add(rightHole);
      }

      group.position.y = 0;
      return group;
    };

    // Create Servers (like RackServer3dWidget style)
    const createServers = (serverList: RackServer[]) => {
      const uHeight = 0.045;
      const rackWidth = 0.36; // Slightly smaller to fit inside rails
      const rackDepth = 0.95;

      serverMeshesRef.current.clear();

      serverList.forEach((server) => {
        const serverHeight = server.height * uHeight - 0.003;
        const serverY = (server.position - 1 + server.height / 2) * uHeight;

        // Create a group for the server
        const serverGroup = new THREE.Group();

        // Main server box - use MeshBasicMaterial like RackServer3dWidget
        const geometry = new THREE.BoxGeometry(
          rackWidth,
          serverHeight,
          rackDepth
        );

        const baseColor = SERVER_TYPE_COLORS[server.type] || 0x6b7280;
        const statusColor = server.status && STATUS_COLORS[server.status];

        // Use MeshBasicMaterial for cleaner look
        const material = new THREE.MeshBasicMaterial({
          color: statusColor || baseColor,
        });

        const serverBox = new THREE.Mesh(geometry, material);
        serverGroup.add(serverBox);

        // Add edges for definition like RackServer3dWidget
        const edges = new THREE.EdgesGeometry(geometry);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x333333 });
        const edgesMesh = new THREE.LineSegments(edges, lineMaterial);
        serverGroup.add(edgesMesh);

        // Position server group
        serverGroup.position.y = serverY;
        serverGroup.userData = { serverId: server.id, server };

        sceneRef.current?.add(serverGroup);
        serverMeshesRef.current.set(server.id, serverGroup as any);
      });
    };

    const rackFrame = createRackFrame();
    scene.add(rackFrame);

    // Add temperature humidity sensors (only if topics exist)
    const doorTopY = rackHeight + yOffset - 0.2; // Top of door minus small offset

    // Front door sensor - positioned at top center of front door
    if (frontTopic && frontTopic.trim()) {
      const frontSensorDisplay = createTempHumSensor({
        position: {
          x: -0.22,
          y: doorTopY,
          z: -0.8, // Lebih jauh dari mesh grid
        },
        label: "Front",
        mqttTopic: frontTopic,
        temperature: 24.5, // Dummy data
        humidity: 65, // Dummy data
      });
      scene.add(frontSensorDisplay.group);
    }

    // Back door sensor - positioned at top center of back door
    if (backTopic && backTopic.trim()) {
      const backSensorDisplay = createTempHumSensor({
        position: {
          x: 0.22,
          y: doorTopY,
          z: 0.8, // Lebih jauh dari mesh grid
        },
        label: "Back",
        mqttTopic: backTopic,
        temperature: 22.8, // Dummy data
        humidity: 58, // Dummy data
      });
      scene.add(backSensorDisplay.group);
    }

    // Render devices dynamically from servers array
    (async () => {
      for (const server of servers) {
        if (!server.deviceType) continue; // Skip if no device type

        try {
          let deviceGroup: THREE.Group | null = null;

          switch (server.deviceType) {
            case "server":
              if (server.position !== undefined && server.height !== undefined) {
                deviceGroup = await createServerDevice3D({
                  position: {
                    u: server.position,
                    height: server.height,
                  },
                  name: server.name,
                  status: (server.status as "online" | "offline" | "warning") || "online",
                });
              }
              break;

            case "pdu-rail":
              if (server.position !== undefined) {
                deviceGroup = createPDURackMount({
                  position: {
                    u: server.position,
                  },
                });
              }
              break;

            case "ups":
              if (server.position !== undefined && server.height !== undefined) {
                deviceGroup = createUPS({
                  position: {
                    u: server.position,
                    height: server.height,
                  },
                  ...(server.name.includes("APC") && { brand: "APC" }),
                });
              }
              break;

            case "pdu-side":
              deviceGroup = createPDUSideMount({
                side: (server.side as "left" | "right") || "left",
                outlets: server.outlets || 8,
              });
              break;

            case "switch":
              if (server.position !== undefined) {
                deviceGroup = createNetworkSwitch({
                  position: {
                    u: server.position,
                  },
                  ports: server.ports || 24,
                  ...(server.name.includes("Cisco") && { brand: "Cisco" }),
                  ...(server.name.includes("Arista") && { brand: "Arista" }),
                });
              }
              break;
          }

          if (deviceGroup) {
            scene.add(deviceGroup);
          }
        } catch (error) {
          console.error(
            `[Rack Viz] Error rendering device ${server.name}:`,
            error
          );
        }
      }
    })();

    // Open doors 90 degrees (both same angle, opposite hinges = opposite directions)
    if (frontDoorRef.current) {
      frontDoorRef.current.rotation.y = Math.PI / 2; // Opens front-left
      doorsOpenRef.current = true;
    }
    if (backDoorRef.current) {
      backDoorRef.current.rotation.y = Math.PI / 2; // Opens back-right (opposite due to hinge position)
    }

    // Mouse interaction
    const onMouseClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);

      const intersects = raycasterRef.current.intersectObjects(
        scene.children,
        true
      );

      for (let i = 0; i < intersects.length; i++) {
        const obj = intersects[i].object as THREE.Mesh;

        // Check object's userData first
        if (obj.userData.serverId) {
          onServerSelect(obj.userData.server);
          break;
        }

        // Check parent group's userData
        if (obj.parent && obj.parent.userData?.serverId) {
          onServerSelect(obj.parent.userData.server);
          break;
        }
      }
    };

    renderer.domElement.addEventListener("click", onMouseClick);

    // Update selected server highlight
    serverMeshesRef.current.forEach((group, serverId) => {
      if (serverId === selectedServerId) {
        group.scale.set(1.08, 1.02, 1.08);
        // Change edge color to highlight for MeshBasicMaterial
        group.traverse((child) => {
          if (
            child instanceof THREE.LineSegments &&
            child.material instanceof THREE.LineBasicMaterial
          ) {
            (child.material as THREE.LineBasicMaterial).color.setHex(0x60a5fa);
            (child.material as THREE.LineBasicMaterial).linewidth = 2;
          }
        });
      } else {
        group.scale.set(1, 1, 1);
        group.traverse((child) => {
          if (
            child instanceof THREE.LineSegments &&
            child.material instanceof THREE.LineBasicMaterial
          ) {
            (child.material as THREE.LineBasicMaterial).color.setHex(0x333333);
            (child.material as THREE.LineBasicMaterial).linewidth = 1;
          }
        });
      }
    });

    // Door toggle animation
    const toggleDoors = () => {
      if (!frontDoorRef.current || !backDoorRef.current) return;

      const isOpen = doorsOpenRef.current;
      const targetRotation = isOpen ? 0 : Math.PI / 2; // 0 or 90 degrees

      // Animate front door (rotates on Y axis)
      const frontStartRotation = frontDoorRef.current.rotation.y;
      const backStartRotation = backDoorRef.current.rotation.y;

      let startTime: number | null = null;
      const duration = 800; // 800ms animation

      const animateDoors = (currentTime: number) => {
        if (startTime === null) startTime = currentTime;

        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease-out cubic for smooth deceleration
        const easeProgress = 1 - Math.pow(1 - progress, 3);

        // Front door rotates outward (positive Y)
        frontDoorRef.current!.rotation.y =
          frontStartRotation +
          (targetRotation - frontStartRotation) * easeProgress;

        // Back door rotates outward (negative Y)
        backDoorRef.current!.rotation.y =
          backStartRotation - (targetRotation - 0) * easeProgress;

        if (progress < 1) {
          requestAnimationFrame(animateDoors);
        } else {
          doorsOpenRef.current = !doorsOpenRef.current;
        }
      };

      requestAnimationFrame(animateDoors);
    };

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // Resize handler
    const handleResize = () => {
      if (!container || !camera) return;

      const width = container.clientWidth;
      const height = container.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("click", onMouseClick);
      container?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [servers, selectedServerId, onServerSelect, frontTopic, backTopic]);

  // Subscribe to MQTT topics for sensors
  useEffect(() => {
    if (frontTopic && frontTopic.trim()) {
      subscribe(frontTopic, (topic: string, payload: string) => {});
    }

    if (backTopic && backTopic.trim()) {
      subscribe(backTopic, (topic: string, payload: string) => {});
    }
  }, [frontTopic, backTopic, subscribe]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-800 dark:to-slate-900"
      style={{ minHeight: "600px" }}
    />
  );
}
