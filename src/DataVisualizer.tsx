import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  PlantData,
  SearchParameter,
  YearFilter,
  YearRange,
  ParameterValue
} from '../types/data';

interface DataVisualizerProps {
  data:      PlantData[];
  years?:    number[];
  center?:   string;   // new
  state?:    string;   // new
  topCount?: number;   // new
}

const DataVisualizer: React.FC<DataVisualizerProps> = ({
  data,
  years,
  center = "",
  state = "",
  topCount = 10
}) => {
  const [selectedParameter, setSelectedParameter] = useState<SearchParameter>('');
  const [yearFilter, setYearFilter] = useState<YearFilter>('all');
  const [selectedYear, setSelectedYear] = useState<number>(0);
  const [yearRange, setYearRange] = useState<YearRange>({ start: 0, end: 0 });
  const [filteredData, setFilteredData] = useState<PlantData[]>([]);

  /* -------- helper to choose Y-axis label -------------------- */
  const getYAxisLabel = (param: string): string => {
    switch (param) {
      case 'avgSavings':
      case 'avgCost':
        return 'Total Amount (Dollars)';
      case 'implementationRate':
        return 'Percent Implemented';
      case 'recommended':
        return 'Number of Recommendations';
      case 'avgPayback':
        return 'Ratio of Cost/Savings';
      default:
        return '';
    }
  };

  /* -------- build chart title -------------------------------- */
  const getChartTitle = (): string => {
    const prettyParam = selectedParameter
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());

    const prefix = center ? `${center} ` : "";
    const suffix = state ? ` (${state} Data)` : "";

    return `${prefix}Top ${topCount} ${prettyParam}${suffix}`;
  };

  /* -------- derive available parameters / years -------------- */
  const availableParameters = useMemo(() => {
    if (data.length === 0) return [];
    const firstItem = data[0] as Record<string, unknown>;
    return Object.keys(firstItem).filter(
      key =>
        key !== 'year' &&
        key !== 'description' &&
        key !== 'arc' &&
        key !== 'top' &&
        typeof firstItem[key] !== 'object'
    );
  }, [data]);

  const availableYears = useMemo(() => {
    if (years?.length) return [...years].sort();
    return Array.from(new Set(data.map(i => i.year))).sort();
  }, [years, data]);

  /* -------- initial parameter / year selections -------------- */
  useEffect(() => {
    if (availableParameters.length && !selectedParameter) {
      setSelectedParameter(availableParameters[0]);
    }
    if (availableYears.length) {
      const max = Math.max(...availableYears);
      setSelectedYear(max);
      setYearRange({ start: Math.min(...availableYears), end: max });
    }
  }, [availableParameters, availableYears, selectedParameter]);

  /* -------- filter by year choice ---------------------------- */
  useEffect(() => {
    if (!data.length) return;
    let f = [...data];
    if (yearFilter === 'single') {
      f = data.filter(i => i.year === selectedYear);
    } else if (yearFilter === 'custom') {
      f = data.filter(i => i.year >= yearRange.start && i.year <= yearRange.end);
    }
    setFilteredData(f);
  }, [data, yearFilter, selectedYear, yearRange]);

  /* -------- helpers for chart data --------------------------- */
  const formatValue = (v: ParameterValue): number =>
    typeof v === 'number' ? v : parseFloat(v.replace(/[$,%]/g, ''));

  const truncate = (s: string, n = 15) => (s.length > n ? s.slice(0, n) + '…' : s);

  const chartData = useMemo(
    () =>
      filteredData.map((item, idx) => ({
        ...item,
        id: idx + 1,
        shortDescription: truncate(item.description),
        [selectedParameter]: formatValue(item[selectedParameter])
      })),
    [filteredData, selectedParameter]
  );

  const highestValue = Math.max(...chartData.map(i => i[selectedParameter] as number));
  const avgValue =
    chartData.reduce((a, i) => a + (i[selectedParameter] as number), 0) /
    chartData.length;

  const display = (v: number): string => {
    const sample = data[0]?.[selectedParameter];
    if (typeof sample === 'string') {
      if (sample.includes('%')) return `${v.toFixed(1)}%`;
      if (sample.includes('$')) return `$${v.toLocaleString()}`;
    }
    return v.toLocaleString();
  };

  /* -------- tooltip component -------------------------------- */
  const CustomTooltip = ({ active, payload }: any) =>
    active && payload?.length ? (
      <div className="bg-white p-4 shadow-lg rounded-lg border border-gray-200">
        <p className="font-semibold mb-2">{payload[0].payload.description}</p>
        <p className="text-sm">{display(payload[0].value)}</p>
        <p className="text-xs text-gray-500 mt-1">Year: {payload[0].payload.year}</p>
      </div>
    ) : null;

  /* -------- Custom legend ------------------------------------ */
  const CustomLegend = () => (
    <div className="flex flex-col gap-2 p-4 bg-gray-50 rounded-lg">
      <h3 className="font-semibold text-sm text-gray-700 mb-2">Recommendations</h3>
      {filteredData.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2 text-sm">
          <span className="font-medium text-gray-600">{idx + 1}.</span>
          <span className="text-gray-800">{item.description}</span>
        </div>
      ))}
    </div>
  );

  /* -------- download helpers --------------------------------- */
  const downloadAsPNG = async () => {
    const el = document.getElementById('chart-container');
    if (el) {
      const canvas = await html2canvas(el);
      const link = document.createElement('a');
      link.download = 'chart.png';
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const downloadAsPDF = async () => {
    const el = document.getElementById('chart-container');
    if (el) {
      const canvas = await html2canvas(el);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF();
      const props = pdf.getImageProperties(imgData);
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (props.height * pdfW) / props.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
      pdf.save('chart.pdf');
    }
  };

  /* -------- guard for no data -------------------------------- */
  if (!data.length) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>No data available for visualization.</p>
      </div>
    );
  }

  /* =========================================================== */
  /* =======================   RENDER   ======================== */
  return (
    <div className="p-6 space-y-6">
      {/* -------------------- CONTROLS ------------------------ */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Parameter dropdown */}
          <select
            value={selectedParameter}
            onChange={e => setSelectedParameter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {availableParameters.map(p => (
              <option key={p} value={p}>
                {p.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
              </option>
            ))}
          </select>

          {/* Year-filter controls (kept simple: show only when not “all”) */}
          {yearFilter === 'single' && (
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(+e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {availableYears.map(y => (
                <option key={y}>{y}</option>
              ))}
            </select>
          )}

          {yearFilter === 'custom' && (
            <div className="flex gap-2 items-center">
              <select
                value={yearRange.start}
                onChange={e =>
                  setYearRange(prev => ({ ...prev, start: +e.target.value }))
                }
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableYears.map(y => (
                  <option key={y}>{y}</option>
                ))}
              </select>
              <span>to</span>
              <select
                value={yearRange.end}
                onChange={e =>
                  setYearRange(prev => ({ ...prev, end: +e.target.value }))
                }
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableYears.map(y => (
                  <option key={y}>{y}</option>
                ))}
              </select>
            </div>
          )}

          {/* Download buttons */}
          <div className="ml-auto space-x-2">
            <button
              onClick={downloadAsPNG}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            >
              <Download className="h-5 w-5 inline-block mr-2" />
              Download PNG
            </button>
            <button
              onClick={downloadAsPDF}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              <Download className="h-5 w-5 inline-block mr-2" />
              Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* -------------------- CHART --------------------------- */}
      {filteredData.length > 0 && (
        <div id="chart-container" className="bg-white p-6 rounded-lg shadow-lg space-y-6">
          <h2 className="text-xl font-bold text-center mb-4">{getChartTitle()}</h2>

          <div className="flex gap-6 items-start">
            <div className="flex-1 min-w-0 h-[600px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 40, bottom: 95 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="shortDescription"
                    tick={{ fontSize: 12, angle: -45, textAnchor: 'end' }}
                    interval={0}
                    tickMargin={8}
                    overflow="visible"
                    label={{ value: 'Recommendations', position: 'bottom', dy: 75 }}
                  />
                  <YAxis
                    label={{
                      value: getYAxisLabel(selectedParameter),
                      angle: -90,
                      position: 'insideLeft',
                      offset: -10,
                      dy: 80
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey={selectedParameter}
                    fill="#3B82F6"
                    name={selectedParameter
                      .replace(/([A-Z])/g, ' $1')
                      .replace(/^./, s => s.toUpperCase())}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* -------------------- STATS ------------------------- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="bg-blue-100 p-6 rounded-lg text-center">
              <h3 className="text-lg font-semibold mb-2">Highest Value</h3>
              <p className="text-2xl font-bold text-blue-600">{display(highestValue)}</p>
            </div>
            <div className="bg-green-100 p-6 rounded-lg text-center">
              <h3 className="text-lg font-semibold mb-2">Average</h3>
              <p className="text-2xl font-bold text-green-600">{display(avgValue)}</p>
            </div>
            <div className="bg-purple-100 p-6 rounded-lg text-center">
              <h3 className="text-lg font-semibold mb-2">Total Records</h3>
              <p className="text-2xl font-bold text-purple-600">{chartData.length}</p>
            </div>
          </div>

          {/* -------------------- LEGEND ------------------------ */}
          <div className="mt-8">
            <CustomLegend />
          </div>
        </div>
      )}
    </div>
  );
};

export default DataVisualizer;
