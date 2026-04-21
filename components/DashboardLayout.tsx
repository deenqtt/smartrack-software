// components/DashboardLayout.tsx
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
// Import the interface directly
interface WidgetLayout {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  widgetType: string;
  config: any;
}
import { WidgetRenderer } from "@/components/widgets/WidgetRenderer";


const ResponsiveGridLayout = WidthProvider(Responsive);

interface DashboardLayoutProps {
  layout: WidgetLayout[];
}

export default function DashboardLayout({ layout }: DashboardLayoutProps) {
  //  Handle empty layout gracefully
  if (!layout || layout.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No widgets to display</p>
      </div>
    );
  }

  return (
    <ResponsiveGridLayout
      className="layout"
      layouts={{ lg: layout }}
      breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
      cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 1 }}
      rowHeight={40}
      margin={[12, 12]}
      isDraggable={false}
      isResizable={false}
    >
      {layout.map((item) => {
        // Filter out items that don't have required properties
        if (!item.widgetType || !item.config) {
          return null;
        }

        return (
          <div
            key={item.i}
            className="bg-background rounded-lg shadow-sm border flex flex-col overflow-hidden"
          >
            <div className="flex-1 w-full h-full">
              <WidgetRenderer item={item} />
            </div>
          </div>
        );
      })}
    </ResponsiveGridLayout>
  );
}
