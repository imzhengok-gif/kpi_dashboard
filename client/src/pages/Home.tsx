import { useEffect, useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Plus, Trash2, Edit2, Settings, Copy, Check, X, Upload, List, Save, FileText, BarChart2, ChevronDown, Trophy, User, LayoutDashboard } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import * as XLSX from 'xlsx';

// --- 接口定义 ---
interface KPIIndicator {
  id: string;
  name: string;
  unit: string;
  defaultTarget: number | null;
  defaultWeight: number;
}

interface EmployeeData {
  id: string;
  name: string;
  values: { [indicatorId: string]: number | null }; // 实际值
  targets: { [indicatorId: string]: number | null }; // 目标值
  weights: { [indicatorId: string]: number }; // 权重%
  units: { [indicatorId: string]: string }; // 单位
}

// --- LocalStorage 工具函数 ---
const STORAGE_KEY = 'kpi_dashboard_dynamic_data_v3';
const INDICATORS_KEY = 'kpi_dashboard_indicators_v3';

const saveToLocalStorage = (employees: EmployeeData[], indicators: KPIIndicator[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(employees));
    localStorage.setItem(INDICATORS_KEY, JSON.stringify(indicators));
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
  // --- 状态管理 ---
  const [indicators, setIndicators] = useState<KPIIndicator[]>([]);
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState('input');
  const [editingMode, setEditingMode] = useState<{ employeeId: string; mode: 'targets' | 'weights' } | null>(null);
  const [selectedIndicatorForRanking, setSelectedIndicatorForRanking] = useState<string | null>(null);
  const [selectedEmployeeForDetail, setSelectedEmployeeForDetail] = useState<string | null>(null);
  const [batchMode, setBatchMode] = useState<{ sourceId: string; type: 'weights' | 'targets' } | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [copySuccess, setCopySuccess] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  // --- 初始化加载 ---
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
        { id: 'kpi_1', name: '新开户净新增资产', unit: '亿', defaultTarget: 10, defaultWeight: 20 },
        { id: 'kpi_2', name: '新增有效户', unit: '户', defaultTarget: 100, defaultWeight: 30 },
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

  // --- 自动保存 ---
  useEffect(() => {
    if (isLoaded && (employees.length > 0 || indicators.length > 0)) {
      saveToLocalStorage(employees, indicators);
    }
  }, [employees, indicators, isLoaded]);

  // --- 核心计算逻辑 ---
  const calculateScore = (actual: number | null, target: number | null, weight: number) => {
    if (actual === null || actual === undefined) return 0;
    if (!target || target === 0) return Math.max(0, Math.min(actual, weight));
    const completion = actual / target;
    const score = Math.max(0, Math.min(completion * weight, weight));
    return Math.round(score * 10000) / 10000;
  };

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

  const getEmployeeTotalMaxScore = (emp: EmployeeData) => {
    let total = 0;
    indicators.forEach(ind => {
      total += emp.weights[ind.id] ?? ind.defaultWeight;
    });
    return total;
  };

  // --- 导入导出逻辑 (5列一组) ---
  const handleExport = () => {
    const ws_data: any[] = [];
    const header1 = ['员工名称'];
    const header2 = ['ID/标识符'];
    
    indicators.forEach(ind => {
      header1.push(`${ind.name}(实际)`, `${ind.name}(目标)`, `${ind.name}(权重%)`, `${ind.name}(得分)`, `${ind.name}(单位)`);
      header2.push(`${ind.id}_actual`, `${ind.id}_target`, `${ind.id}_weight`, `${ind.id}_score`, `${ind.id}_unit`);
    });
    header1.push('总分');
    header2.push('total_score');
    
    ws_data.push(header1);
    ws_data.push(header2);

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

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const jsonData: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (jsonData.length < 2) return;

        const headers = jsonData[0];
        const newIndicators: KPIIndicator[] = [];
        
        for (let i = 1; i < headers.length - 1; i += 5) {
          const baseName = String(headers[i]).replace('(实际)', '');
          if (baseName && baseName !== '总分') {
            newIndicators.push({
              id: `kpi_${(i - 1) / 5 + 1}`,
              name: baseName,
              unit: '',
              defaultTarget: 0,
              defaultWeight: 0
            });
          }
        }

        const newEmployees: EmployeeData[] = [];
        for (let i = 2; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row[0]) continue;

          const emp: EmployeeData = {
            id: String(i - 1),
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
            
            if (i === 2) {
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

  // --- PDF 导出 ---
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
              .page-break { page-break-after: always; }
              .visual-only { display: ${mode === 'visual' ? 'table-cell' : 'none'}; }
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

  // --- UI 辅助函数 ---
  const addEmployee = () => {
    const newId = String(Date.now());
    setEmployees([...employees, { id: newId, name: `新员工`, values: {}, targets: {}, weights: {}, units: {} }]);
  };

  const removeEmployee = (id: string) => {
    if (employees.length > 1) {
      setEmployees(employees.filter(e => e.id !== id));
    }
  };

  const addIndicator = () => {
    const newId = `kpi_${Date.now()}`;
    setIndicators([...indicators, { id: newId, name: `新指标`, unit: '个', defaultTarget: 100, defaultWeight: 10 }]);
  };

  const handleBatchCopy = () => {
    if (!batchMode || selectedEmployees.size === 0) return;
    const sourceEmp = employees.find(e => e.id === batchMode.sourceId);
    if (!sourceEmp) return;

    setEmployees(employees.map(emp => {
      if (selectedEmployees.has(emp.id) && emp.id !== batchMode.sourceId) {
        if (batchMode.type === 'weights') {
          return { ...emp, weights: { ...sourceEmp.weights } };
        } else {
          return { ...emp, targets: { ...sourceEmp.targets } };
        }
      }
      return emp;
    }));

    setCopySuccess(true);
    setTimeout(() => {
      setCopySuccess(false);
      setBatchMode(null);
      setSelectedEmployees(new Set());
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 顶部导航栏 */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-700 p-2 rounded-lg">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">KPI 绩效管理系统</h1>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">动态指标架构 · 5列一组自由增减</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="gap-2 border-slate-200 hover:bg-slate-50">
              <Upload className="w-4 h-4" /> 导入数据
            </Button>
            <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".xlsx,.xls" />
            <Button onClick={handleExport} variant="outline" className="gap-2 border-slate-200 hover:bg-slate-50">
              <Download className="w-4 h-4" /> 导出数据
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="gap-2 bg-blue-700 hover:bg-blue-800 shadow-md">
                  <FileText className="w-4 h-4" /> 导出 PDF <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => handleExportPDF('data')} className="cursor-pointer">
                  <FileText className="w-4 h-4 mr-2" /> 纯数据版本
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportPDF('visual')} className="cursor-pointer">
                  <BarChart2 className="w-4 h-4 mr-2" /> 带可视化版本
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-white border border-slate-200 p-1 h-12 mb-6 shadow-sm">
            <TabsTrigger value="input" className="px-8 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none font-semibold">
              数据输入
            </TabsTrigger>
            <TabsTrigger value="stats" className="px-8 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none font-semibold">
              结果统计
            </TabsTrigger>
          </TabsList>

          {/* 数据输入标签页 */}
          <TabsContent value="input" className="space-y-6 outline-none">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" /> 员工绩效明细
              </h2>
              <div className="flex gap-2">
                <Button onClick={addIndicator} variant="outline" size="sm" className="text-blue-600 border-blue-100 hover:bg-blue-50">
                  <Plus className="w-4 h-4 mr-1" /> 添加指标
                </Button>
                <Button onClick={addEmployee} variant="outline" size="sm" className="text-blue-600 border-blue-100 hover:bg-blue-50">
                  <Plus className="w-4 h-4 mr-1" /> 添加员工
                </Button>
              </div>
            </div>

            {batchMode && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 p-2 rounded-full">
                    <Copy className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-blue-900">批量复制模式: {batchMode.type === 'weights' ? '权重' : '目标值'}</p>
                    <p className="text-xs text-blue-700">请选择要应用到的员工，然后点击确认</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setBatchMode(null)} variant="ghost" size="sm" className="text-slate-500">取消</Button>
                  <Button onClick={handleBatchCopy} size="sm" className="bg-blue-600 hover:bg-blue-700 gap-2">
                    {copySuccess ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    确认应用 ({selectedEmployees.size})
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-6">
              {employees.map((employee) => {
                const totalScore = getEmployeeTotalScore(employee);
                const totalMaxScore = getEmployeeTotalMaxScore(employee);
                const isSelected = selectedEmployees.has(employee.id);
                
                return (
                  <Card key={employee.id} className={`p-6 border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl bg-white overflow-hidden ${isSelected ? 'ring-2 ring-blue-500 border-transparent' : ''}`}>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-6 border-b border-slate-100">
                      <div className="flex items-center gap-4 flex-1 w-full md:w-auto">
                        {batchMode && employee.id !== batchMode.sourceId && (
                          <Checkbox 
                            checked={isSelected} 
                            onCheckedChange={() => {
                              const next = new Set(selectedEmployees);
                              if (next.has(employee.id)) next.delete(employee.id);
                              else next.add(employee.id);
                              setSelectedEmployees(next);
                            }}
                            className="w-6 h-6 border-slate-300 data-[state=checked]:bg-blue-600"
                          />
                        )}
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">员工名称</label>
                          <Input
                            value={employee.name}
                            onChange={(e) => setEmployees(prev => prev.map(emp => emp.id === employee.id ? { ...emp, name: e.target.value } : emp))}
                            className="max-w-xs font-bold text-xl border-none hover:bg-slate-50 focus:bg-white p-0 h-auto focus-visible:ring-0"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">当前总分</div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-black text-blue-700">{totalScore.toFixed(2)}</span>
                            <span className="text-xs text-slate-400 font-bold">/ {totalMaxScore.toFixed(0)}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-10 w-10 p-0 rounded-lg border-slate-200 text-slate-600">
                                <Copy className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setBatchMode({ sourceId: employee.id, type: 'targets' }); setSelectedEmployees(new Set()); }}>复制目标值到其他员工</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setBatchMode({ sourceId: employee.id, type: 'weights' }); setSelectedEmployees(new Set()); }}>复制权重到其他员工</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Button
                            onClick={() => setEditingMode(editingMode?.employeeId === employee.id && editingMode?.mode === 'targets' ? null : { employeeId: employee.id, mode: 'targets' })}
                            variant={editingMode?.employeeId === employee.id && editingMode?.mode === 'targets' ? "default" : "outline"}
                            size="sm"
                            className={`h-10 w-10 p-0 rounded-lg transition-colors ${editingMode?.employeeId === employee.id && editingMode?.mode === 'targets' ? 'bg-blue-600' : 'border-slate-200 text-slate-600'}`}
                            title="编辑目标值"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => setEditingMode(editingMode?.employeeId === employee.id && editingMode?.mode === 'weights' ? null : { employeeId: employee.id, mode: 'weights' })}
                            variant={editingMode?.employeeId === employee.id && editingMode?.mode === 'weights' ? "default" : "outline"}
                            size="sm"
                            className={`h-10 w-10 p-0 rounded-lg transition-colors ${editingMode?.employeeId === employee.id && editingMode?.mode === 'weights' ? 'bg-blue-600' : 'border-slate-200 text-slate-600'}`}
                            title="编辑权重"
                          >
                            <Settings className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => removeEmployee(employee.id)}
                            variant="ghost"
                            size="sm"
                            className="h-10 w-10 p-0 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {indicators.map(ind => {
                        const actual = employee.values[ind.id] ?? 0;
                        const target = employee.targets[ind.id] ?? ind.defaultTarget ?? 0;
                        const weight = employee.weights[ind.id] ?? ind.defaultWeight;
                        const score = calculateScore(actual, target, weight);
                        const unit = employee.units[ind.id] ?? ind.unit;
                        const completion = target ? Math.max(0, Math.min(actual / target, 1)) : 0;

                        return (
                          <div key={ind.id} className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-4 hover:bg-white hover:shadow-sm transition-all border-l-4 border-l-blue-500">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <Input 
                                  value={ind.name}
                                  onChange={(e) => setIndicators(prev => prev.map(i => i.id === ind.id ? { ...i, name: e.target.value } : i))}
                                  className="text-sm font-bold border-none bg-transparent p-0 h-auto focus:ring-0 text-slate-700"
                                />
                                <div className="flex items-center gap-1 mt-1">
                                  <span className="text-[10px] text-slate-400 font-bold">单位:</span>
                                  <Input 
                                    value={ind.unit}
                                    onChange={(e) => setIndicators(prev => prev.map(i => i.id === ind.id ? { ...i, unit: e.target.value } : i))}
                                    className="text-[10px] w-12 border-none bg-transparent p-0 h-auto focus:ring-0 text-slate-500 font-bold"
                                  />
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-black text-blue-600">{score.toFixed(2)}</div>
                                <div className="text-[9px] text-slate-400 font-bold uppercase">得分</div>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1">
                                  <div className="text-[9px] text-slate-400 font-bold mb-1 uppercase">实际值</div>
                                  <Input
                                    type="number"
                                    value={employee.values[ind.id] ?? ''}
                                    onChange={(e) => {
                                      const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                      setEmployees(prev => prev.map(emp => emp.id === employee.id ? { ...emp, values: { ...emp.values, [ind.id]: val } } : emp));
                                    }}
                                    className="h-9 text-sm font-bold rounded-lg border-slate-200 focus:border-blue-500"
                                  />
                                </div>
                                {editingMode?.employeeId === employee.id && editingMode?.mode === 'targets' && (
                                  <div className="flex-1">
                                    <div className="text-[9px] text-blue-500 font-bold mb-1 uppercase">目标值</div>
                                    <Input
                                      type="number"
                                      value={employee.targets[ind.id] ?? ind.defaultTarget ?? ''}
                                      onChange={(e) => {
                                        const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                        setEmployees(prev => prev.map(emp => emp.id === employee.id ? { ...emp, targets: { ...emp.targets, [ind.id]: val } } : emp));
                                      }}
                                      className="h-9 text-sm font-bold rounded-lg border-blue-200 bg-blue-50 text-blue-700"
                                    />
                                  </div>
                                )}
                                {editingMode?.employeeId === employee.id && editingMode?.mode === 'weights' && (
                                  <div className="flex-1">
                                    <div className="text-[9px] text-orange-500 font-bold mb-1 uppercase">权重%</div>
                                    <Input
                                      type="number"
                                      value={employee.weights[ind.id] ?? ind.defaultWeight ?? ''}
                                      onChange={(e) => {
                                        const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                        setEmployees(prev => prev.map(emp => emp.id === employee.id ? { ...emp, weights: { ...emp.weights, [ind.id]: val } } : emp));
                                      }}
                                      className="h-9 text-sm font-bold rounded-lg border-orange-200 bg-orange-50 text-orange-700"
                                    />
                                  </div>
                                )}
                              </div>
                              <div className="space-y-1">
                                <div className="flex justify-between text-[9px] font-bold text-slate-400">
                                  <span>完成度</span>
                                  <span>{(completion * 100).toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                  <div className="bg-blue-600 h-full transition-all duration-700 ease-out shadow-[0_0_8px_rgba(37,99,235,0.4)]" style={{ width: `${completion * 100}%` }}></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* 结果统计标签页 */}
          <TabsContent value="stats" className="space-y-6 outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 左侧：单项指标排名 */}
              <Card className="p-6 lg:col-span-2 border-slate-200 shadow-sm rounded-xl bg-white">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                    <Trophy className="w-5 h-5 text-yellow-500" /> 单项指标排名
                  </h3>
                  <select 
                    value={selectedIndicatorForRanking ?? ''} 
                    onChange={(e) => setSelectedIndicatorForRanking(e.target.value)}
                    className="text-sm font-bold border-slate-200 rounded-lg px-4 py-2 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                  >
                    {indicators.map(ind => <option key={ind.id} value={ind.id}>{ind.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <div key={item.name} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-blue-200 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 flex items-center justify-center rounded-full text-sm font-black shadow-sm ${idx === 0 ? 'bg-yellow-400 text-white' : idx === 1 ? 'bg-slate-300 text-white' : idx === 2 ? 'bg-orange-300 text-white' : 'bg-slate-50 text-slate-400'}`}>
                            {idx + 1}
                          </div>
                          <span className="font-bold text-slate-700">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-xl text-blue-700">{item.score.toFixed(2)}</div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">完成度: {(item.completion * 100).toFixed(1)}%</div>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </Card>

              {/* 右侧：全员总分排名 */}
              <Card className="p-6 border-slate-200 shadow-sm rounded-xl bg-white">
                <h3 className="text-lg font-bold flex items-center gap-2 mb-8 text-slate-800">
                  <BarChart2 className="w-5 h-5 text-blue-600" /> 全员总分排名
                </h3>
                <div className="space-y-3">
                  {employees
                    .map(emp => ({ name: emp.name, total: getEmployeeTotalScore(emp) }))
                    .sort((a, b) => b.total - a.total)
                    .map((item, idx) => (
                      <div key={item.name} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl shadow-sm border-l-4 border-l-blue-600 hover:bg-blue-50/30 transition-colors">
                        <div className="flex items-center gap-4">
                          <span className="text-slate-300 font-black text-sm">#{String(idx + 1).padStart(2, '0')}</span>
                          <span className="font-bold text-slate-700">{item.name}</span>
                        </div>
                        <span className="font-black text-2xl text-slate-900">{item.total.toFixed(2)}</span>
                      </div>
                    ))
                  }
                </div>
              </Card>

              {/* 底部：员工业务完成度排名 */}
              <Card className="p-6 lg:col-span-3 border-slate-200 shadow-sm rounded-xl bg-white">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                    <List className="w-5 h-5 text-blue-600" /> 员工业务完成度排名
                  </h3>
                  <select 
                    value={selectedEmployeeForDetail ?? ''} 
                    onChange={(e) => setSelectedEmployeeForDetail(e.target.value)}
                    className="text-sm font-bold border-slate-200 rounded-lg px-4 py-2 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                  >
                    <option value="">—— 选择员工查看详情 ——</option>
                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                  </select>
                </div>
                
                {selectedEmployeeForDetail && (() => {
                  const emp = employees.find(e => e.id === selectedEmployeeForDetail);
                  if (!emp) return null;
                  
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {indicators
                        .map(ind => {
                          const actual = emp.values[ind.id] ?? 0;
                          const target = emp.targets[ind.id] ?? ind.defaultTarget ?? 1;
                          const weight = emp.weights[ind.id] ?? ind.defaultWeight;
                          const score = calculateScore(actual, target, weight);
                          const completion = target ? (actual / target) : 0;
                          return { name: ind.name, score, completion, unit: ind.unit };
                        })
                        .sort((a, b) => b.completion - a.completion)
                        .map((item, idx) => (
                          <div key={item.name} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-blue-400">#{idx + 1}</span>
                                <span className="text-sm font-bold text-slate-700">{item.name}</span>
                              </div>
                              <span className="text-xs font-black text-blue-600">{(item.completion * 100).toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-blue-500 h-full" style={{ width: `${Math.min(item.completion * 100, 100)}%` }}></div>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  );
                })()}
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* 隐藏的 PDF 导出区域 */}
        <div className="hidden">
          <div ref={pdfRef} className="p-8 bg-white">
            <h1 className="text-3xl font-bold text-center mb-12 text-slate-900">KPI 绩效考核年度报告</h1>
            <div className="space-y-12">
              {employees.map(emp => (
                <div key={emp.id} className="page-break">
                  <div className="flex justify-between items-end border-b-4 border-blue-700 pb-4 mb-8">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800">{emp.name}</h2>
                      <p className="text-slate-500">个人绩效考核明细</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-slate-400 uppercase tracking-widest">最终得分</div>
                      <div className="text-4xl font-black text-blue-700">{getEmployeeTotalScore(emp).toFixed(2)}</div>
                    </div>
                  </div>
                  
                  <table className="w-full border-collapse mb-8">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border p-3 text-left text-slate-600">考核指标</th>
                        <th className="border p-3 text-center text-slate-600">实际值</th>
                        <th className="border p-3 text-center text-slate-600">目标值</th>
                        <th className="border p-3 text-center text-slate-600">权重%</th>
                        <th className="border p-3 text-center text-slate-600">得分</th>
                        <th className="border p-3 text-center visual-only text-slate-600">达成进度</th>
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
                            <td className="border p-3 font-medium">{ind.name}</td>
                            <td className="border p-3 text-center">{actual} {unit}</td>
                            <td className="border p-3 text-center">{target} {unit}</td>
                            <td className="border p-3 text-center">{weight}%</td>
                            <td className="border p-3 text-center font-bold text-blue-700">{score.toFixed(2)}</td>
                            <td className="border p-3 text-center visual-only">
                              <div className="progress-bar">
                                <div className="progress-fill" style={{ width: `${completion * 100}%` }}></div>
                              </div>
                              <div className="text-[8px] text-slate-400 mt-1">{(completion * 100).toFixed(1)}%</div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
