// ECharts utilities with tree shaking optimization
import * as echarts from 'echarts/core';

// Import only the components we need for better tree shaking
import {
  LineChart as LineChartCore,
  BarChart as BarChartCore,
  PieChart as PieChartCore,
  ScatterChart as ScatterChartCore,
  GaugeChart as GaugeChartCore,
} from 'echarts/charts';

// Import renderers
import {
  CanvasRenderer,
} from 'echarts/renderers';

// Import components
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  MarkLineComponent,
  MarkPointComponent,
  MarkAreaComponent,
} from 'echarts/components';

// Register only the components we use globally
echarts.use([
  // Charts
  LineChartCore,
  BarChartCore,
  PieChartCore,
  ScatterChartCore,
  GaugeChartCore,

  // Components
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  MarkLineComponent,
  MarkPointComponent,
  MarkAreaComponent,

  // Renderers
  CanvasRenderer,
]);

// Export the configured echarts instance
export { echarts };

// Common chart options factory functions
export const createLineChartOptions = (data: any, config: any) => ({
  title: {
    text: config.title || 'Line Chart',
  },
  tooltip: {
    trigger: 'axis',
  },
  legend: {
    data: config.legend || [],
  },
  xAxis: {
    type: 'category',
    data: data.categories || [],
  },
  yAxis: {
    type: 'value',
  },
  series: data.series || [],
});

export const createBarChartOptions = (data: any, config: any) => ({
  title: {
    text: config.title || 'Bar Chart',
  },
  tooltip: {
    trigger: 'axis',
  },
  legend: {
    data: config.legend || [],
  },
  xAxis: {
    type: 'category',
    data: data.categories || [],
  },
  yAxis: {
    type: 'value',
  },
  series: data.series || [],
});

export const createGaugeChartOptions = (data: any, config: any) => ({
  series: [{
    type: 'gauge',
    data: [{ value: data.value || 0, name: config.name || 'Value' }],
    min: config.min || 0,
    max: config.max || 100,
    splitNumber: config.splitNumber || 10,
    axisLine: {
      lineStyle: {
        width: 10,
      },
    },
    splitLine: {
      length: 15,
      lineStyle: {
        width: 2,
      },
    },
    axisTick: {
      length: 12,
      lineStyle: {
        width: 1,
      },
    },
    anchor: {
      show: true,
      showAbove: true,
      size: 25,
      itemStyle: {
        borderWidth: 10,
      },
    },
    title: {
      show: false,
    },
    detail: {
      valueAnimation: true,
      fontSize: 20,
      offsetCenter: [0, '70%'],
    },
    pointer: {
      icon: 'path://M2.9,0.7L2.9,0.7c1.4,0,2.6,1.2,2.6,2.6v13c0,1.4-1.2,2.6-2.6,2.6h0c-1.4,0-2.6-1.2-2.6-2.6V3.3C0.3,1.9,1.5,0.7,2.9,0.7z',
      width: 8,
      length: '60%',
      offsetCenter: [0, '8%'],
    },
  }],
});
