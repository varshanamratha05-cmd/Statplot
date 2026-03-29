import ReactEChartsCore from 'echarts-for-react/lib/core'
import { BarChart, BoxplotChart, HeatmapChart, LineChart, ScatterChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent, VisualMapComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  BarChart,
  BoxplotChart,
  HeatmapChart,
  LineChart,
  ScatterChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  VisualMapComponent,
  CanvasRenderer,
])

type ResultChartProps = {
  option: Record<string, unknown>
  style?: React.CSSProperties
  onChartReady?: (instance: { getDataURL: (opts: Record<string, unknown>) => string }) => void
}

function ResultChart(props: ResultChartProps) {
  return (
    <ReactEChartsCore
      echarts={echarts}
      option={props.option}
      style={props.style}
      onChartReady={props.onChartReady}
    />
  )
}

export default ResultChart
