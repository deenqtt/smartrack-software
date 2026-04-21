"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import type { ReactNode } from "react";
import type PahoType from "paho-mqtt";
import { getEnvMQTTBrokerUrl } from "@/lib/mqtt-config";

// Tipe untuk callback listener
type MqttListener = (topic: string, payload: string, retained?: boolean) => void;

interface MqttContextType {
  isReady: boolean;
  connectionStatus: string;
  publish: (topic: string, payload: string) => void;
  subscribe: (topic: string, listener: MqttListener) => void;
  unsubscribe: (topic: string, listener: MqttListener) => void;
}

const MqttContext = createContext<MqttContextType>({
  isReady: false,
  connectionStatus: "Disconnected",
  publish: () => console.warn("MQTT Provider not ready"),
  subscribe: () => console.warn("MQTT Provider not ready"),
  unsubscribe: () => console.warn("MQTT Provider not ready"),
});

export function useMqtt() {
  return useContext(MqttContext);
}

function DemoMqttProvider({ children }: { children: ReactNode }) {
  return (
    <MqttContext.Provider
      value={{
        isReady: true,
        connectionStatus: "Demo Mode",
        publish: () => {},
        subscribe: () => {},
        unsubscribe: () => {},
      }}
    >
      {children}
    </MqttContext.Provider>
  );
}

export function MqttProvider({ children }: { children: ReactNode }) {
  // DEMO_MODE: Return no-op provider — data comes from DemoMqttServerProvider
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    return <DemoMqttProvider>{children}</DemoMqttProvider>;
  }

  const clientRef = useRef<PahoType.Client | null>(null);
  const [connectionStatus, setConnectionStatus] = useState("Connecting");
  const [isReady, setIsReady] = useState(false);
  const [forceReconnectKey, setForceReconnectKey] = useState(0);
  const listenersRef = useRef<Map<string, MqttListener[]>>(new Map());

  const publish = useCallback((topic: string, payload: string) => {
    if (clientRef.current && typeof clientRef.current.isConnected === 'function' && clientRef.current.isConnected()) {
      try {
        const Paho = require("paho-mqtt");
        const message = new Paho.Message(payload);
        message.destinationName = topic;
        clientRef.current.send(message);
      } catch (err) {
        console.warn(`MQTT publish failed for topic ${topic}:`, err);
      }
    }
  }, []);

  const subscribe = useCallback((topic: string, listener: MqttListener) => {
    const topicListeners = listenersRef.current.get(topic) || [];
    if (!topicListeners.includes(listener)) {
      listenersRef.current.set(topic, [...topicListeners, listener]);
    }

    // Only attempt subscription if client is connected
    // Subscriptions are batched when connection is established
    if (clientRef.current?.isConnected()) {
      try {
        clientRef.current.subscribe(topic);
      } catch (err) {
        console.warn(`MQTT subscribe failed for ${topic}:`, err);
      }
    }
  }, []);

  const matchesTopic = (wildcard: string, actualTopic: string): boolean => {
    if (wildcard === actualTopic) return true;
    if (wildcard.endsWith('/#')) {
      const prefix = wildcard.slice(0, -2);
      return actualTopic.startsWith(prefix + '/');
    }
    if (wildcard.includes('+')) {
      // Basic + matching for single level
      const pattern = wildcard.replace(/\//g, '\\/').replace(/\+/g, '[^/]+');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(actualTopic);
    }
    return false;
  };

  const unsubscribe = useCallback((topic: string, listener: MqttListener) => {
    const topicListeners = listenersRef.current.get(topic) || [];
    const newListeners = topicListeners.filter((l) => l !== listener);
    if (newListeners.length > 0) {
      listenersRef.current.set(topic, newListeners);
    } else {
      listenersRef.current.delete(topic);
      if (clientRef.current && typeof clientRef.current.isConnected === 'function' && clientRef.current.isConnected()) {
        try {
          clientRef.current.unsubscribe(topic);
        } catch (err) {
          console.warn(`MQTT unsubscribe failed for topic ${topic}:`, err);
        }
      }
    }
  }, []);

  // Optimized MQTT connection management with cleanup
  useEffect(() => {
    if (clientRef.current) return;

    const mqttBrokerUrl = getEnvMQTTBrokerUrl();

    // Parse the MQTT broker URL
    let mqttHost = "localhost";
    let mqttPort = 9000;
    let useSSL = false;

    try {
      const url = new URL(mqttBrokerUrl);
      mqttHost = url.hostname;
      mqttPort = parseInt(url.port) || (url.protocol === 'wss:' ? 443 : 80);
      useSSL = url.protocol === 'wss:';
    } catch (error) {
      console.error('Error parsing MQTT broker URL in MqttContext:', error);
      setConnectionStatus("Configuration Error");
      return;
    }

    const clientId = `web-client-${Math.random().toString(36).substring(2, 15)}${Date.now()}`;

    const Paho = require("paho-mqtt");
    const mqttClient = new Paho.Client(mqttHost, mqttPort, clientId);
    clientRef.current = mqttClient;

    // Enhanced connection event handlers
    mqttClient.onConnectionLost = (responseObject: PahoType.MQTTError) => {
      if (responseObject.errorCode !== 0) {
        setConnectionStatus("Disconnected");
        setIsReady(false);
        console.warn('MQTT connection lost:', responseObject.errorMessage);
      }
    };

    mqttClient.onMessageArrived = (message: PahoType.Message) => {
      const topic = message.destinationName;
      const payload = message.payloadString;

      // Process messages efficiently
      listenersRef.current.forEach((topicListeners, wildcard) => {
        if (matchesTopic(wildcard, topic)) {
          topicListeners.forEach((listener) => {
            try {
              listener(topic, payload, message.retained);
            } catch (error) {
              console.error(`Error in MQTT listener for topic ${topic}:`, error);
            }
          });
        }
      });
    };

    // Connect with optimized settings
    mqttClient.connect({
      onSuccess: () => {
        setConnectionStatus("Connected");
        setIsReady(true);

        // Use batched subscription instead of subscribing all at once
        const pendingSubscriptions = Array.from(listenersRef.current.keys());
        if (pendingSubscriptions.length > 0) {
          const batchSize = 20;

          for (let i = 0; i < pendingSubscriptions.length; i += batchSize) {
            const delay = i * 100; // Stagger by 100ms between batches
            setTimeout(() => {
              const batch = pendingSubscriptions.slice(i, i + batchSize);
              batch.forEach(topic => {
                try {
                  if (clientRef.current?.isConnected()) {
                    clientRef.current.subscribe(topic);
                  }
                } catch (err) {
                  console.warn(`MQTT subscribe failed for ${topic}:`, err);
                }
              });
            }, delay);
          }
        }
      },
      onFailure: (responseObject: PahoType.MQTTError) => {
        setConnectionStatus("Failed to Connect");
        setIsReady(false);
        console.error('MQTT connection failed:', responseObject.errorMessage);
      },
      useSSL: useSSL,
      reconnect: true,
      cleanSession: true,
      keepAliveInterval: 30, // 30 seconds keep alive
      timeout: 10, // 10 seconds connection timeout
    });

    // Cleanup function for connection
    return () => {
      if (clientRef.current) {
        try {
          if (clientRef.current.isConnected()) {
            // Unsubscribe from all topics before disconnecting
            listenersRef.current.forEach((_, topic) => {
              try {
                clientRef.current?.unsubscribe(topic);
              } catch (err) {
                console.warn(`MQTT cleanup unsubscribe failed for ${topic}:`, err);
              }
            });
            clientRef.current.disconnect();
          }
        } catch (error) {
          console.error('Error during MQTT cleanup:', error);
        } finally {
          clientRef.current = null;
        }
      }
    };
  }, [forceReconnectKey]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        try {
          if (clientRef.current.isConnected()) {
            // Final cleanup - unsubscribe from all topics
            listenersRef.current.forEach((_, topic) => {
              try {
                clientRef.current?.unsubscribe(topic);
              } catch (err) {
                console.warn(`Final MQTT cleanup unsubscribe failed for ${topic}:`, err);
              }
            });
            clientRef.current.disconnect();
          }
        } catch (error) {
          console.error('Error during final MQTT cleanup:', error);
        }
      }
    };
  }, []);

  const value = { isReady, connectionStatus, publish, subscribe, unsubscribe };

  return <MqttContext.Provider value={value}>{children}</MqttContext.Provider>;
}