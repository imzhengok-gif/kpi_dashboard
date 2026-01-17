import { useEffect, useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Plus, Trash2, Edit2, Settings, Copy, Check, X, Upload, List, Save, FileText, BarChart2, ChevronDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import * as XLSX from 'xlsx';

// 定义 KPI 指标接口
interface KPIIndicator {
  id: string;
  name: string;
  unit: string;
  defaultTarget: number | null;
  defaultWeight: number;
}

// 定义员工数据接口
interface EmployeeData {
  id: string;
  name: string;
  values: { [indicatorId: string]: number | null }; // 实际值
  targets: { [indicatorId: string]: number | null }; // 目标值
  weights: { [indicatorId: string]: number }; // 权重%
  units: { [indicatorId: string]: string }; // 单位
}

// LocalStorage 工具函数
const STORAGE_KEY = 'kpi_dashboard_dynamic_data';
const INDICATORS_KEY = 'kpi_dashboard_indicators';

const saveToLocalStorage = (employees: EmployeeData[], indicators: KPIIndicator[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(employees));
    localStorage.setItem(INDICATORS_KEY, JSON.stringify(indicators));
    console.log('✅ Data saved to LocalStorage');
    return true;
  } catch (error) {
    console.error('❌ Failed to save to LocalStorage:', error);
    return false;
  }
};

const loadFromLocalStorage = () => {
  try {
    const empData = localStorage.getItem(STORAGE_KEY);
    const indData = localStorage.getItem(INDICATORS_KEY);
    if (empData && indData) {
      return {
        employees: JSON.parse(empData) as EmployeeData[],
        indicators: JSON.parse(indData) as KPIIndicator[]
      };
    }
  } catch (error) {
    console.error('❌ Failed to load from LocalStorage:', error);
  }
  return null;
};

export default function Home() {
  const [indicators, setIndicators] = useState<KPIIndicator[]>([]);
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState('input');
  const [selectedIndicatorForRanking, setSelectedIndicatorForRanking] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  // 初始化加载
  useEffect(() => {
    const saved = loadFromLocalStorage();
    if (saved) {
      setIndicators(saved.indicators);
      setEmployees(saved.employees);
      if (saved.indicators.length > 0) {
        setSelectedIndicatorForRanking(saved.indicators[0].id);
      }
    } else {
      // 默认初始数据
      const defaultIndicators: KPIIndicator[] = [
        { id: 'kpi_1', name: '指标1', unit: '个', defaultTarget: 100, defaultWeight: 20 },
        { id: 'kpi_2', name: '指标2', unit: '元', defaultTarget: 1000, defaultWeight: 30 },
      ];
      const defaultEmployees: EmployeeData[] = Array.from({ length: 5 }, (_, i) => ({
        id: String(i + 1),
        name: `员工${i + 1}`,
        values: {},
        targets: {},
        weights: {},
        units: {}
      }));
      setIndicators(defaultIndicators);
      setEmployees(defaultEmployees);
      setSelectedIndicatorForRanking(defaultIndicators[0].id);
    }
    setIsLoaded(true);
  }, []);

  // 自动保存
  useEffect(() => {
    if (isLoaded && (employees.length > 0 || indicators.length > 0)) {
      saveToLocalStorage(employees, indicators);
    }
  }, [employees, indicators, isLoaded]);

  // 计算单项得分
  const calculateScore = (actual: number | null, target: number | null, weight: number) => {
    if (actual === null || actual === undefined) return 0;
    if (!target || target === 0) return Math.max(0, Math.min(actual, weight));
    const completion = actual / target;
    const score = Math.max(0, Math.min(completion * weight, weight));
    return Math.round(score * 10000) / 10000;
  };

  // 计算员工总分
  const getEmployeeTotalScore = (emp: EmployeeData) => {
    let total = 0;
    indicators.forEach(ind => {
      const actual = emp.values[ind.id] ?? 0;
      const target = emp.targets[ind.id] ?? ind.defaultTarget ?? 0;
      const weight = emp.weights[ind.id] ?? ind.defaultWeight;
      total += calculateScore(actual, target, weight);
    });
    return Math.round(total * 10000) / 10000;
  };

  // 导出数据 (5列一组)
  const handleExport = () => {
    const ws_data: any[] = [];
    
    // 第一行：表头 (名称)
    const header1 = ['员工名称'];
    indicators.forEach(ind => {
      header1.push(`${ind.name}(实际)`, `${ind.name}(目标)`, `${ind.name}(权重%)`, `${ind.name}(得分)`, `${ind.name}(单位)`);
    });
    header1.push('总分');
    ws_data.push(header1);

    // 员工数据行
    employees.forEach(emp => {
      const row: any[] = [emp.name];
      let totalScore = 0;
      indicators.forEach(ind => {
        const actual = emp.values[ind.id] ?? null;
        const target = emp.targets[ind.id] ?? ind.defaultTarget;
        const weight = emp.weights[ind.id] ?? ind.defaultWeight;
        const unit = emp.units[ind.id] ?? ind.unit;
        const score = calculateScore(actual, target, weight);
        totalScore += score;
        row.push(actual, target, weight, score, unit);
      });
      row.push(Math.round(totalScore * 10000) / 10000);
      ws_data.push(row);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, "KPI数据");
    XLSX.writeFile(wb, `KPI数据_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // 导入数据 (5列一组动态识别)
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (jsonData.length < 1) return;

        const headers = jsonData[0];
        const newIndicators: KPIIndicator[] = [];
        
        // 识别指标：从第2列开始，每5列一组
        for (let i = 1; i < headers.length - 1; i += 5) {
          const baseName = String(headers[i]).replace('(实际)', '');
          if (baseName && baseName !== '总分') {
            newIndicators.push({
              id: `kpi_${(i - 1) / 5 + 1}`,
              name: baseName,
              unit: '', // 将从数据行中获取
              defaultTarget: 0,
              defaultWeight: 0
            });
          }
        }

        const newEmployees: EmployeeData[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row[0]) continue;

          const emp: EmployeeData = {
            id: String(i),
            name: String(row[0]),
            values: {},
            targets: {},
            weights: {},
            units: {}
          };

          newIndicators.forEach((ind, idx) => {
            const baseIdx = 1 + idx * 5;
            emp.values[ind.id] = row[baseIdx] !== undefined ? parseFloat(row[baseIdx]) : null;
            emp.targets[ind.id] = row[baseIdx + 1] !== undefined ? parseFloat(row[baseIdx + 1]) : null;
            emp.weights[ind.id] = row[baseIdx + 2] !== undefined ? parseFloat(row[baseIdx + 2]) : 0;
            emp.units[ind.id] = row[baseIdx + 4] ? String(row[baseIdx + 4]) : '';
            
            // 同步单位到指标定义（取第一个员工的单位作为默认）
            if (i === 1) {
              ind.unit = emp.units[ind.id];
              ind.defaultTarget = emp.targets[ind.id];
              ind.defaultWeight = emp.weights[ind.id];
            }
          });
          newEmployees.push(emp);
        }

        setIndicators(newIndicators);
        setEmployees(newEmployees);
        if (newIndicators.length > 0) setSelectedIndicatorForRanking(newIndicators[0].id);
        alert(`✅ 成功导入 ${newEmployees.length} 名员工和 ${newIndicators.length} 个指标`);
      } catch (err) {
        console.error(err);
        alert('❌ 导入失败，请检查文件格式');
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 导出 PDF
  const handleExportPDF = (mode: 'data' | 'visual') => {
    if (!pdfRef.current) return;
    const printWindow = window.open('', '', 'width=1000,height=800');
    if (!printWindow) return;

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(style => style.outerHTML).join('\n');

    printWindow.document.write(`
      <html>
        <head>
          <title>KPI 成绩报告</title>
          ${mode === 'visual' ? styles : ''}
          <style>
            @media print {
              body { padding: 20px; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
              th { background-color: #f2f2f2 !important; }
              .progress-bar { height: 10px; background: #eee; border-radius: 5px; overflow: hidden; width: 100px; display: inline-block; }
              .progress-fill { height: 100%; background: #1e40af; }
            }
          </style>
        </head>
        <body>
          ${pdfRef.current.innerHTML}
          <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }</script>
        </body>
      </html>
    `);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">KPI 绩效管理系统</h1>
            <p className="text-slate-500">动态指标架构 · 5列一组自由增减</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="gap-2">
              <Upload className="w-4 h-4" /> 导入数据
            </Button>
            <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".xlsx,.xls" />
            <Button onClick={handleExport} variant="outline" className="gap-2">
              <Download className="w-4 h-4" /> 导出数据
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="gap-2 bg-blue-700 hover:bg-blue-800">
                  <FileText className="w-4 h-4" /> 导出 PDF <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExportPDF('data')}>纯数据版本</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportPDF('visual')}>带可视化版本</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="input">数据输入</TabsTrigger>
            <TabsTrigger value="stats">结果统计</TabsTrigger>
          </TabsList>

          <TabsContent value="input" className="mt-6">
            <Card className="p-6 overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left p-3 font-semibold text-slate-700 sticky left-0 bg-white z-10">员工名称</th>
                    {indicators.map(ind => (
                      <th key={ind.id} className="p-3 text-center border-l border-slate-100 min-w-[300px]">
                        <div className="flex flex-col gap-1">
                          <Input 
                            value={ind.name} 
                            onChange={(e) => {
                              const newName = e.target.value;
                              setIndicators(prev => prev.map(i => i.id === ind.id ? { ...i, name: newName } : i));
                            }}
                            className="text-center font-bold border-none hover:bg-slate-50 focus:bg-white"
                          />
                          <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                            单位: 
                            <Input 
                              value={ind.unit} 
                              onChange={(e) => {
                                const newUnit = e.target.value;
                                setIndicators(prev => prev.map(i => i.id === ind.id ? { ...i, unit: newUnit } : i));
                              }}
                              className="w-16 h-6 text-center p-0 border-none hover:bg-slate-50 focus:bg-white"
                            />
                          </div>
                        </div>
                      </th>
                    ))}
                    <th className="p-3 text-right font-semibold text-slate-700 border-l border-slate-100">总分</th>
                  </tr>
                  <tr className="bg-slate-50 text-[10px] text-slate-400 uppercase tracking-wider">
                    <th className="p-2 sticky left-0 bg-slate-50 z-10"></th>
                    {indicators.map(ind => (
                      <th key={`${ind.id}-sub`} className="p-2 border-l border-slate-100">
                        <div className="grid grid-cols-3 gap-1 px-2">
                          <span>实际值</span>
                          <span>目标值</span>
                          <span>权重%</span>
                        </div>
                      </th>
                    ))}
                    <th className="p-2 border-l border-slate-100"></th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => (
                    <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-medium text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-100">
                        {emp.name}
                      </td>
                      {indicators.map(ind => (
                        <td key={`${emp.id}-${ind.id}`} className="p-2 border-l border-slate-100">
                          <div className="grid grid-cols-3 gap-2">
                            <Input 
                              type="number"
                              value={emp.values[ind.id] ?? ''}
                              onChange={(e) => {
                                const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, values: { ...e.values, [ind.id]: val } } : e));
                              }}
                              className="h-8 text-center"
                            />
                            <Input 
                              type="number"
                              value={emp.targets[ind.id] ?? ind.defaultTarget ?? ''}
                              onChange={(e) => {
                                const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, targets: { ...e.targets, [ind.id]: val } } : e));
                              }}
                              className="h-8 text-center bg-slate-50"
                            />
                            <Input 
                              type="number"
                              value={emp.weights[ind.id] ?? ind.defaultWeight ?? ''}
                              onChange={(e) => {
                                const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, weights: { ...e.weights, [ind.id]: val } } : e));
                              }}
                              className="h-8 text-center bg-slate-50"
                            />
                          </div>
                        </td>
                      ))}
                      <td className="p-3 text-right font-bold text-blue-700">
                        {getEmployeeTotalScore(emp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 flex justify-between items-center">
                <Button onClick={() => {
                  const newId = `kpi_${indicators.length + 1}`;
                  setIndicators([...indicators, { id: newId, name: `新指标${indicators.length + 1}`, unit: '个', defaultTarget: 100, defaultWeight: 10 }]);
                }} variant="ghost" className="text-blue-600 gap-2">
                  <Plus className="w-4 h-4" /> 添加指标列组
                </Button>
                <Button onClick={() => {
                  const newId = String(employees.length + 1);
                  setEmployees([...employees, { id: newId, name: `新员工${employees.length + 1}`, values: {}, targets: {}, weights: {}, units: {} }]);
                }} variant="ghost" className="text-blue-600 gap-2">
                  <Plus className="w-4 h-4" /> 添加员工行
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-blue-600" /> 单项指标排名
                  </h3>
                  <select 
                    value={selectedIndicatorForRanking ?? ''} 
                    onChange={(e) => setSelectedIndicatorForRanking(e.target.value)}
                    className="text-sm border rounded p-1"
                  >
                    {indicators.map(ind => <option key={ind.id} value={ind.id}>{ind.name}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  {employees
                    .map(emp => {
                      const indId = selectedIndicatorForRanking!;
                      const actual = emp.values[indId] ?? 0;
                      const target = emp.targets[indId] ?? indicators.find(i => i.id === indId)?.defaultTarget ?? 1;
                      const weight = emp.weights[indId] ?? indicators.find(i => i.id === indId)?.defaultWeight ?? 0;
                      const score = calculateScore(actual, target, weight);
                      const completion = target ? (actual / target) : 0;
                      return { name: emp.name, score, completion };
                    })
                    .sort((a, b) => b.score - a.score || b.completion - a.completion)
                    .map((item, idx) => (
                      <div key={item.name} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${idx < 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                            {idx + 1}
                          </span>
                          <span className="font-medium">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-blue-700">{item.score} 分</div>
                          <div className="text-[10px] text-slate-400">完成度: {(item.completion * 100).toFixed(2)}%</div>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                  <List className="w-5 h-5 text-blue-600" /> 总分全员排名
                </h3>
                <div className="space-y-3">
                  {employees
                    .map(emp => ({ name: emp.name, total: getEmployeeTotalScore(emp) }))
                    .sort((a, b) => b.total - a.total)
                    .map((item, idx) => (
                      <div key={item.name} className="flex items-center justify-between p-2 bg-slate-50 rounded border-l-4 border-blue-600">
                        <div className="flex items-center gap-3">
                          <span className="text-slate-400 font-mono">#{String(idx + 1).padStart(2, '0')}</span>
                          <span className="font-medium">{item.name}</span>
                        </div>
                        <span className="font-bold text-lg text-slate-900">{item.total}</span>
                      </div>
                    ))
                  }
                </div>
              </Card>
            </div>

            {/* 隐藏的 PDF 导出区域 */}
            <div className="hidden">
              <div ref={pdfRef} className="p-8 bg-white">
                <h1 className="text-2xl font-bold text-center mb-8">KPI 绩效考核报告</h1>
                <div className="space-y-8">
                  {employees.map(emp => (
                    <div key={emp.id} className="page-break-after-always">
                      <h2 className="text-xl font-bold border-b-2 border-blue-600 pb-2 mb-4">{emp.name} - 个人成绩单</h2>
                      <table className="w-full border-collapse mb-4">
                        <thead>
                          <tr className="bg-slate-100">
                            <th className="border p-2 text-left">指标名称</th>
                            <th className="border p-2 text-center">实际值</th>
                            <th className="border p-2 text-center">目标值</th>
                            <th className="border p-2 text-center">权重%</th>
                            <th className="border p-2 text-center">得分</th>
                            <th className="border p-2 text-center visual-only">进度</th>
                          </tr>
                        </thead>
                        <tbody>
                          {indicators.map(ind => {
                            const actual = emp.values[ind.id] ?? 0;
                            const target = emp.targets[ind.id] ?? ind.defaultTarget ?? 0;
                            const weight = emp.weights[ind.id] ?? ind.defaultWeight;
                            const score = calculateScore(actual, target, weight);
                            const unit = emp.units[ind.id] ?? ind.unit;
                            const completion = target ? Math.max(0, Math.min(actual / target, 1)) : 0;
                            return (
                              <tr key={ind.id}>
                                <td className="border p-2">{ind.name}</td>
                                <td className="border p-2 text-center">{actual} {unit}</td>
                                <td className="border p-2 text-center">{target} {unit}</td>
                                <td className="border p-2 text-center">{weight}%</td>
                                <td className="border p-2 text-center font-bold">{score}</td>
                                <td className="border p-2 text-center visual-only">
                                  <div className="progress-bar">
                                    <div className="progress-fill" style={{ width: `${completion * 100}%` }}></div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          <tr className="bg-slate-50 font-bold">
                            <td colSpan={4} className="border p-2 text-right">总计得分：</td>
                            <td className="border p-2 text-center text-blue-700 text-lg">{getEmployeeTotalScore(emp)}</td>
                            <td className="border p-2 visual-only"></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
