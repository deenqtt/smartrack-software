import { useMqtt } from "@/contexts/MqttContext";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff } from "lucide-react";

export default function MqttStatus() {
  const { isReady, connectionStatus } = useMqtt();

  return (
    <Badge
      variant={isReady ? "default" : "destructive"}
      className={`flex items-center gap-2 ${
        isReady ? "bg-green-600 hover:bg-green-700" : ""
      }`}
    >
      {isReady ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
      {isReady ? "Connected" : "Disconnected"}
    </Badge>
  );
}
