export type DashboardCategory = "Overview" | "Capacity" | "Security" | "Analytic" | "Power" | "UPS" | "Cooling" | "Environment";

export function getWidgetCategory(widgetType: string, config: any = {}): DashboardCategory {
  // If we assigned a category during the merge process, use it
  if (config?.assignedCategory) {
    return config.assignedCategory as DashboardCategory;
  }

  const type_lower = widgetType.toLowerCase();
  const name_lower = (config?.customName || config?.widgetTitle || "").toLowerCase();
  const combined = `${type_lower} ${name_lower}`;

  // Environment
  if (
    combined.includes("environment") ||
    combined.includes("vibrat") ||
    combined.includes("temphum") ||
    combined.includes("temp hum") ||
    combined.includes("sensor") ||
    combined.includes("lightning") ||
    combined.includes("leakage") ||
    combined.includes("smoke") ||
    combined.includes("water leak") ||
    combined.includes("flood")
  ) {
    return "Environment";
  }

  // Security
  if (
    combined.includes("security") ||
    combined.includes("alarm") ||
    combined.includes("access") ||
    combined.includes("door") ||
    combined.includes("gate") ||
    combined.includes("motion")
  ) {
    return "Security";
  }

  // Cooling
  if (
    combined.includes("cooling") ||
    combined.includes("temperature") ||
    combined.includes("humidity") ||
    combined.includes("fan") ||
    combined.includes("chiller") ||
    combined.includes("air") ||
    combined.includes("temp") ||
    combined.includes("hum") ||
    combined.includes("hvac")
  ) {
    return "Cooling";
  }

  // UPS
  if (
    combined.includes("ups") ||
    combined.includes("battery") ||
    combined.includes("rectifier") ||
    combined.includes("charge")
  ) {
    return "UPS";
  }

  // Power
  if (
    combined.includes("power") ||
    combined.includes("energy") ||
    combined.includes("volt") ||
    combined.includes("amp") ||
    combined.includes("watt") ||
    combined.includes("zap") ||
    combined.includes("breaker") ||
    combined.includes("pdu") ||
    combined.includes("load") ||
    combined.includes("current") ||
    combined.includes("voltage") ||
    combined.includes("pdm")
  ) {
    return "Power";
  }

  // Analytic
  if (
    combined.includes("chart") ||
    combined.includes("bar") ||
    combined.includes("line") ||
    combined.includes("trend") ||
    combined.includes("report") ||
    combined.includes("analytic") ||
    combined.includes("log") ||
    combined.includes("history") ||
    combined.includes("analysis") ||
    combined.includes("summary") ||
    combined.includes("comparator") ||
    combined.includes("metric") ||
    combined.includes("calculated") ||
    combined.includes("statistics")
  ) {
    return "Analytic";
  }

  // Default to Overview (Everything else like 3D Rack, shortcuts, images, text)
  return "Overview";
}
