import { useEffect, useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Plus, Trash2, Edit2, Settings, Copy, Check, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import html2pdf from 'html2pdf.js';

interface KPIIndicator {
  name: string;
  target: number | null;
  weight: number;
  unit: string;
  id?: string;
  isCustom?: boolean;
}

interface KPICategory {
  指标: KPIIndicator[];
}

interface KPIStructure {
  [key: string]: KPICategory;
}

interface EmployeeData {
  id: string;
  name: string;
  targets: { [key: string]: number | null };
  weights: { [key: string]: number };
  customIndicators?: { [key: string]: KPIIndicator };
  [key: string]: string | number | { [key: string]: number | null } | { [key: string]: number } | { [key: string]: KPIIndicator } | undefined;
}

interface EmployeeKPI {
  [key: string]: {
    actual: number;
    score: number;
    target: number | null;
  };
}

export default function Home() {
  const [kpiStructure, setKpiStructure] = useState<KPIStructure | null>(null);
  const [employees, setEmployees] = useState<EmployeeData[]>([
    { id: '1', name: '员工1', targets: {}, weights: {}, customIndicators: {} },
    { id: '2', name: '员工2', targets: {}, weights: {}, customIndicators: {} },
    { id: '3', name: '员工3', targets: {}, weights: {}, customIndicators: {} },
    { id: '4', name: '员工4', targets: {}, weights: {}, customIndicators: {} },
    { id: '5', name: '员工5', targets: {}, weights: {}, customIndicators: {} },
    { id: '6', name: '员工6', targets: {}, weights: {}, customIndicators: {} },
    { id: '7', name: '员工7', targets: {}, weights: {}, customIndicators: {} },
    { id: '8', name: '员工8', targets: {}, weights: {}, customIndicators: {} },
    { id: '9', name: '员工9', targets: {}, weights: {}, customIndicators: {} },
    { id: '10', name: '员工10', targets: {}, weights: {}, customIndicators: {} },
    { id: '11', name: '员工11', targets: {}, weights: {}, customIndicators: {} },
  ]);
  const [editingMode, setEditingMode] = useState<{ employeeId: string; mode: 'targets' | 'weights' } | null>(null);
  const [batchMode, setBatchMode] = useState<{ sourceId: string; type: 'weights' | 'targets' } | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [copySuccess, setCopySuccess] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [addingCustom, setAddingCustom] = useState<{ employeeId: string; name: string; unit: string; weight: number } | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchKPIStructure = async () => {
      try {
        const response = await fetch('/kpi_structure.json');
        const data: KPIStructure = await response.json();
        setKpiStructure(data);
        const firstCategory = Object.keys(data)[0];
        setSelectedCategory(firstCategory);

        setEmployees((prevEmployees) =>
          prevEmployees.map((emp) => {
            const targets: { [key: string]: number | null } = {};
            const weights: { [key: string]: number } = {};
            Object.entries(data).forEach(([category, categoryData]) => {
              categoryData.指标.forEach((indicator) => {
                const key = `${category}_${indicator.name}`;
                targets[key] = indicator.target;
                weights[key] = indicator.weight * 100;
              });
            });
            return { ...emp, targets, weights, customIndicators: {} };
          })
        );
      } catch (error) {
        console.error('Failed to load KPI structure:', error);
      }
    };

    fetchKPIStructure();
  }, []);

  // 计算 KPI 得分
  const calculateKPI = (actual: number, target: number | null, weightPercentage: number) => {
    if (target === null || target === 0) {
      return Math.min(actual, weightPercentage);
    }
    const completion = actual / target;
    const score = Math.min(completion * weightPercentage, weightPercentage);
    return Math.round(score * 100) / 100;
  };

  // 获取员工的 KPI 数据
  const getEmployeeKPI = (employeeId: string): EmployeeKPI => {
    const kpi: EmployeeKPI = {};
    if (!kpiStructure) return kpi;

    const employee = employees.find((e) => e.id === employeeId);
    if (!employee) return kpi;

    Object.entries(kpiStructure).forEach(([category, categoryData]) => {
      categoryData.指标.forEach((indicator) => {
        const key = `${category}_${indicator.name}`;
        const actual = parseFloat(String(employee[key] || 0));
        const target = employee.targets[key] ?? indicator.target;
        const weightPercentage = employee.weights[key] ?? indicator.weight * 100;
        kpi[key] = {
          actual,
          score: calculateKPI(actual, target, weightPercentage),
          target,
        };
      });
    });

    // 添加自定义指标
    if (employee.customIndicators) {
      Object.entries(employee.customIndicators).forEach(([key, indicator]) => {
        const actual = parseFloat(String(employee[key] || 0));
        const target = employee.targets[key] ?? indicator.target;
        const weightPercentage = employee.weights[key] ?? indicator.weight;
        kpi[key] = {
          actual,
          score: calculateKPI(actual, target, weightPercentage),
          target,
        };
      });
    }

    return kpi;
  };

  // 计算员工总分
  const getEmployeeTotalScore = (employeeId: string) => {
    const kpi = getEmployeeKPI(employeeId);
    return Object.values(kpi).reduce((sum, item) => sum + item.score, 0);
  };

  // 获取员工的总满分
  const getEmployeeTotalMaxScore = (employeeId: string) => {
    const employee = employees.find((e) => e.id === employeeId);
    if (!employee) return 0;
    return Object.values(employee.weights).reduce((sum, w) => sum + w, 0);
  };

  // 获取业务线得分
  const getCategoryScores = (employeeId: string) => {
    if (!kpiStructure) return {};
    const employee = employees.find((e) => e.id === employeeId);
    if (!employee) return {};

    const categoryScores: { [key: string]: number } = {};
    Object.entries(kpiStructure).forEach(([category, categoryData]) => {
      let categoryScore = 0;
      categoryData.指标.forEach((indicator) => {
        const key = `${category}_${indicator.name}`;
        const actual = parseFloat(String(employee[key] || 0));
        const target = employee.targets[key] ?? indicator.target;
        const weightPercentage = employee.weights[key] ?? indicator.weight * 100;
        categoryScore += calculateKPI(actual, target, weightPercentage);
      });
      categoryScores[category] = Math.round(categoryScore * 100) / 100;
    });
    return categoryScores;
  };

  // 处理员工数据输入
  const handleEmployeeDataChange = (employeeId: string, key: string, value: string) => {
    setEmployees(
      employees.map((emp) =>
        emp.id === employeeId ? { ...emp, [key]: value === '' ? 0 : parseFloat(value) } : emp
      )
    );
  };

  // 处理员工名称变更
  const handleEmployeeNameChange = (employeeId: string, name: string) => {
    setEmployees(
      employees.map((emp) => (emp.id === employeeId ? { ...emp, name } : emp))
    );
  };

  // 处理员工目标值变更
  const handleEmployeeTargetChange = (employeeId: string, indicatorKey: string, value: string) => {
    setEmployees(
      employees.map((emp) =>
        emp.id === employeeId
          ? {
              ...emp,
              targets: {
                ...emp.targets,
                [indicatorKey]: value === '' ? null : parseFloat(value),
              },
            }
          : emp
      )
    );
  };

  // 处理员工权重变更
  const handleEmployeeWeightChange = (employeeId: string, indicatorKey: string, value: string) => {
    setEmployees(
      employees.map((emp) =>
        emp.id === employeeId
          ? {
              ...emp,
              weights: {
                ...emp.weights,
                [indicatorKey]: parseFloat(value) || 0,
              },
            }
          : emp
      )
    );
  };

  // 添加自定义考核项目
  const addCustomIndicator = (employeeId: string) => {
    if (!addingCustom || !addingCustom.name) return;

    const customKey = `custom_${Date.now()}`;
    setEmployees(
      employees.map((emp) =>
        emp.id === employeeId
          ? {
              ...emp,
              customIndicators: {
                ...emp.customIndicators,
                [customKey]: {
                  name: addingCustom.name,
                  unit: addingCustom.unit,
                  weight: addingCustom.weight,
                  target: null,
                  isCustom: true,
                },
              },
              weights: {
                ...emp.weights,
                [customKey]: addingCustom.weight,
              },
              targets: {
                ...emp.targets,
                [customKey]: null,
              },
            }
          : emp
      )
    );
    setAddingCustom(null);
  };

  // 删除自定义考核项目
  const removeCustomIndicator = (employeeId: string, indicatorKey: string) => {
    setEmployees(
      employees.map((emp) =>
        emp.id === employeeId
          ? {
              ...emp,
              customIndicators: Object.fromEntries(
                Object.entries(emp.customIndicators || {}).filter(([key]) => key !== indicatorKey)
              ),
              weights: Object.fromEntries(
                Object.entries(emp.weights).filter(([key]) => key !== indicatorKey)
              ),
              targets: Object.fromEntries(
                Object.entries(emp.targets).filter(([key]) => key !== indicatorKey)
              ),
            }
          : emp
      )
    );
  };

  // 复制自定义考核项目
  const copyCustomIndicators = (sourceId: string, targetIds: Set<string>) => {
    const sourceEmployee = employees.find((e) => e.id === sourceId);
    if (!sourceEmployee) return;

    setEmployees(
      employees.map((emp) => {
        if (targetIds.has(emp.id) && emp.id !== sourceId) {
          return {
            ...emp,
            customIndicators: { ...sourceEmployee.customIndicators },
            weights: {
              ...emp.weights,
              ...Object.fromEntries(
                Object.entries(sourceEmployee.customIndicators || {}).map(([key, indicator]) => [
                  key,
                  indicator.weight,
                ])
              ),
            },
            targets: {
              ...emp.targets,
              ...Object.fromEntries(
                Object.entries(sourceEmployee.customIndicators || {}).map(([key]) => [key, null])
              ),
            },
          };
        }
        return emp;
      })
    );
  };

  // 批量复制权重或目标值
  const handleBatchCopy = () => {
    if (!batchMode || selectedEmployees.size === 0) return;

    const sourceEmployee = employees.find((e) => e.id === batchMode.sourceId);
    if (!sourceEmployee) return;

    setEmployees(
      employees.map((emp) => {
        if (selectedEmployees.has(emp.id) && emp.id !== batchMode.sourceId) {
          if (batchMode.type === 'weights') {
            return {
              ...emp,
              weights: { ...sourceEmployee.weights },
            };
          } else {
            return {
              ...emp,
              targets: { ...sourceEmployee.targets },
            };
          }
        }
        return emp;
      })
    );

    setCopySuccess(true);
    setTimeout(() => {
      setCopySuccess(false);
      setBatchMode(null);
      setSelectedEmployees(new Set());
    }, 2000);
  };

  // 切换员工选择
  const toggleEmployeeSelection = (employeeId: string) => {
    const newSelected = new Set(selectedEmployees);
    if (newSelected.has(employeeId)) {
      newSelected.delete(employeeId);
    } else {
      newSelected.add(employeeId);
    }
    setSelectedEmployees(newSelected);
  };

  // 添加员工
  const addEmployee = () => {
    const newId = String(Math.max(...employees.map(e => parseInt(e.id))) + 1);
    const targets: { [key: string]: number | null } = {};
    const weights: { [key: string]: number } = {};
    if (kpiStructure) {
      Object.entries(kpiStructure).forEach(([category, categoryData]) => {
        categoryData.指标.forEach((indicator) => {
          const key = `${category}_${indicator.name}`;
          targets[key] = indicator.target;
          weights[key] = indicator.weight * 100;
        });
      });
    }
    setEmployees([...employees, { id: newId, name: `员工${newId}`, targets, weights, customIndicators: {} }]);
  };

  // 删除员工
  const removeEmployee = (employeeId: string) => {
    if (employees.length > 1) {
      setEmployees(employees.filter((emp) => emp.id !== employeeId));
      selectedEmployees.delete(employeeId);
    }
  };

  // 导出为 Excel
  const exportToExcel = () => {
    if (!kpiStructure) return;

    let csv = '员工名称';

    Object.entries(kpiStructure).forEach(([category, categoryData]) => {
      categoryData.指标.forEach((indicator) => {
        csv += `,${category}_${indicator.name}(实际),${category}_${indicator.name}(目标),${category}_${indicator.name}(权重%),${category}_${indicator.name}(得分)`;
      });
    });
    csv += ',总分\n';

    employees.forEach((employee) => {
      csv += employee.name;
      const kpi = getEmployeeKPI(employee.id);
      Object.entries(kpiStructure).forEach(([category, categoryData]) => {
        categoryData.指标.forEach((indicator) => {
          const key = `${category}_${indicator.name}`;
          const actual = kpi[key]?.actual || 0;
          const target = kpi[key]?.target ?? '';
          const weight = employee.weights[key] ?? 0;
          const score = kpi[key]?.score || 0;
          csv += `,${actual},${target},${weight},${score}`;
        });
      });
      csv += `,${getEmployeeTotalScore(employee.id)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `KPI计算结果_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 导出为 PDF
  const exportToPDF = () => {
    if (!pdfRef.current) return;

    const element = pdfRef.current;
    const opt = {
      margin: 10,
      filename: `KPI报告_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'png' as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'portrait' as const, unit: 'mm', format: 'a4' },
    };

    html2pdf().set(opt).from(element).save();
  };

  // 准备员工饼状图数据
  const preparePieData = (employeeId: string) => {
    const categoryScores = getCategoryScores(employeeId);
    return Object.entries(categoryScores).map(([name, value]) => ({
      name,
      value: Math.round(value * 100) / 100,
    }));
  };

  // 准备业务线排名数据
  const prepareCategoryRankingData = () => {
    if (!selectedCategory || !kpiStructure) return [];
    
    return employees
      .map((emp) => {
        const categoryScores = getCategoryScores(emp.id);
        const categoryData = kpiStructure[selectedCategory];
        let categoryMaxScore = 0;
        
        categoryData.指标.forEach((indicator) => {
          const key = `${selectedCategory}_${indicator.name}`;
          const weight = emp.weights[key] ?? indicator.weight * 100;
          categoryMaxScore += weight;
        });

        return {
          name: emp.name,
          score: categoryScores[selectedCategory] || 0,
          maxScore: categoryMaxScore,
          completion: categoryMaxScore > 0 ? ((categoryScores[selectedCategory] || 0) / categoryMaxScore) * 100 : 0,
        };
      })
      .sort((a, b) => b.score - a.score);
  };

  const COLORS = ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#d946ef'];

  if (!kpiStructure) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground">加载数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-primary text-primary-foreground py-8">
        <div className="container">
          <h1 className="text-4xl font-bold mb-2">KPI 计算管理系统</h1>
          <p className="text-lg opacity-90">输入员工数据，自动计算 KPI 成绩</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-12">
        <Tabs defaultValue="data-input" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="data-input">数据输入</TabsTrigger>
            <TabsTrigger value="results">结果统计</TabsTrigger>
          </TabsList>

          {/* 数据输入标签页 */}
          <TabsContent value="data-input" className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-foreground">员工 KPI 数据输入</h2>
              <Button onClick={addEmployee} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                添加员工
              </Button>
            </div>

            {/* 批量操作面板 */}
            {batchMode && (
              <Card className="p-6 bg-accent/10 border-accent">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-bold text-foreground mb-2">
                        批量复制{batchMode.type === 'weights' ? '权重' : '目标值'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        从 <span className="font-semibold">{employees.find(e => e.id === batchMode.sourceId)?.name}</span> 复制{batchMode.type === 'weights' ? '权重' : '目标值'}到选定的员工
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        setBatchMode(null);
                        setSelectedEmployees(new Set());
                      }}
                      variant="outline"
                      size="sm"
                    >
                      取消
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {employees.map((emp) => (
                      <div
                        key={emp.id}
                        className="flex items-center gap-2 p-3 bg-background rounded border border-border"
                      >
                        <Checkbox
                          checked={selectedEmployees.has(emp.id)}
                          onCheckedChange={() => toggleEmployeeSelection(emp.id)}
                          disabled={emp.id === batchMode.sourceId}
                        />
                        <label className="text-sm font-medium text-foreground cursor-pointer flex-1">
                          {emp.name}
                        </label>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button
                      onClick={handleBatchCopy}
                      disabled={selectedEmployees.size === 0}
                      className="gap-2"
                    >
                      {copySuccess ? (
                        <>
                          <Check className="w-4 h-4" />
                          已复制
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          复制到 {selectedEmployees.size} 人
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            <div className="space-y-6">
              {employees.map((employee) => {
                const totalScore = getEmployeeTotalScore(employee.id);
                const totalMaxScore = getEmployeeTotalMaxScore(employee.id);

                return (
                  <Card key={employee.id} className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                          员工名称
                        </label>
                        <Input
                          value={employee.name}
                          onChange={(e) => handleEmployeeNameChange(employee.id, e.target.value)}
                          className="max-w-xs"
                        />
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">总分</div>
                        <div className="text-3xl font-bold text-primary">
                          {totalScore.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">/ {totalMaxScore.toFixed(2)}</div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        {editingMode?.employeeId === employee.id && editingMode?.mode === 'targets' ? (
                          <Button
                            onClick={() => setEditingMode(null)}
                            variant="default"
                            size="sm"
                          >
                            完成
                          </Button>
                        ) : (
                          <Button
                            onClick={() => setEditingMode({ employeeId: employee.id, mode: 'targets' })}
                            variant="outline"
                            size="sm"
                            title="编辑目标值"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                        {editingMode?.employeeId === employee.id && editingMode?.mode === 'weights' ? (
                          <Button
                            onClick={() => setEditingMode(null)}
                            variant="default"
                            size="sm"
                          >
                            完成
                          </Button>
                        ) : (
                          <Button
                            onClick={() => setEditingMode({ employeeId: employee.id, mode: 'weights' })}
                            variant="outline"
                            size="sm"
                            title="编辑权重"
                          >
                            <Settings className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          onClick={() => setBatchMode({ sourceId: employee.id, type: 'weights' })}
                          variant="outline"
                          size="sm"
                          title="批量复制权重"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => setBatchMode({ sourceId: employee.id, type: 'targets' })}
                          variant="outline"
                          size="sm"
                          title="批量复制目标值"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        {employees.length > 1 && (
                          <Button
                            onClick={() => removeEmployee(employee.id)}
                            variant="ghost"
                            size="sm"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* 指标输入网格 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                      {Object.entries(kpiStructure).map(([category, categoryData]) =>
                        categoryData.指标.map((indicator) => {
                          const key = `${category}_${indicator.name}`;
                          const actual = parseFloat(String(employee[key] || 0));
                          const kpi = getEmployeeKPI(employee.id);
                          const score = kpi[key]?.score || 0;
                          const target = kpi[key]?.target;
                          const weightPercentage = employee.weights[key] ?? indicator.weight * 100;

                          return (
                            <div key={key} className="bg-secondary p-4 rounded-lg">
                              <label className="block text-sm font-medium text-foreground mb-2">
                                {indicator.name}
                              </label>
                              <div className="flex gap-2 mb-2">
                                <Input
                                  type="number"
                                  placeholder="实际值"
                                  value={actual || ''}
                                  onChange={(e) =>
                                    handleEmployeeDataChange(employee.id, key, e.target.value)
                                  }
                                  className="flex-1"
                                />
                                <span className="text-sm text-muted-foreground py-2 px-2 bg-background rounded">
                                  {indicator.unit}
                                </span>
                              </div>

                              {/* 目标值编辑 */}
                              {editingMode?.employeeId === employee.id && editingMode?.mode === 'targets' ? (
                                <div className="mb-2">
                                  <label className="text-xs text-muted-foreground mb-1 block">
                                    目标值
                                  </label>
                                  <div className="flex gap-2">
                                    <Input
                                      type="number"
                                      placeholder="留空表示不考核"
                                      value={target ?? ''}
                                      onChange={(e) =>
                                        handleEmployeeTargetChange(employee.id, key, e.target.value)
                                      }
                                      className="flex-1 text-xs"
                                    />
                                    <span className="text-xs text-muted-foreground py-2 px-2 bg-background rounded">
                                      {indicator.unit}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground mb-1">
                                  目标: {target !== null && target !== undefined ? `${target} ${indicator.unit}` : '不考核'}
                                </div>
                              )}

                              {/* 权重编辑 */}
                              {editingMode?.employeeId === employee.id && editingMode?.mode === 'weights' ? (
                                <div className="mb-2">
                                  <label className="text-xs text-muted-foreground mb-1 block">
                                    权重占比
                                  </label>
                                  <div className="flex gap-2">
                                    <Input
                                      type="number"
                                      step="0.1"
                                      value={weightPercentage}
                                      onChange={(e) =>
                                        handleEmployeeWeightChange(employee.id, key, e.target.value)
                                      }
                                      className="flex-1 text-xs"
                                    />
                                    <span className="text-xs text-muted-foreground py-2 px-2 bg-background rounded">
                                      %
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground mb-1">
                                  权重: {weightPercentage.toFixed(2)}%
                                </div>
                              )}

                              <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">
                                  {target !== null && target !== 0
                                    ? `完成度: ${((actual / target) * 100).toFixed(1)}%`
                                    : '无目标'}
                                </span>
                                <span className="text-sm font-bold text-accent">
                                  得分: {score.toFixed(2)} / {weightPercentage.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}

                      {/* 自定义考核项目 */}
                      {employee.customIndicators &&
                        Object.entries(employee.customIndicators).map(([key, indicator]) => {
                          const actual = parseFloat(String(employee[key] || 0));
                          const kpi = getEmployeeKPI(employee.id);
                          const score = kpi[key]?.score || 0;
                          const target = kpi[key]?.target;
                          const weightPercentage = employee.weights[key] ?? indicator.weight;

                          return (
                            <div key={key} className="bg-secondary p-4 rounded-lg border-2 border-accent">
                              <div className="flex justify-between items-start mb-2">
                                <label className="block text-sm font-medium text-foreground">
                                  {indicator.name} <span className="text-xs text-accent">(自定义)</span>
                                </label>
                                <Button
                                  onClick={() => removeCustomIndicator(employee.id, key)}
                                  variant="ghost"
                                  size="sm"
                                >
                                  <X className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                              <div className="flex gap-2 mb-2">
                                <Input
                                  type="number"
                                  placeholder="实际值"
                                  value={actual || ''}
                                  onChange={(e) =>
                                    handleEmployeeDataChange(employee.id, key, e.target.value)
                                  }
                                  className="flex-1"
                                />
                                <span className="text-sm text-muted-foreground py-2 px-2 bg-background rounded">
                                  {indicator.unit}
                                </span>
                              </div>

                              {editingMode?.employeeId === employee.id && editingMode?.mode === 'targets' ? (
                                <div className="mb-2">
                                  <label className="text-xs text-muted-foreground mb-1 block">
                                    目标值
                                  </label>
                                  <div className="flex gap-2">
                                    <Input
                                      type="number"
                                      placeholder="留空表示不考核"
                                      value={target ?? ''}
                                      onChange={(e) =>
                                        handleEmployeeTargetChange(employee.id, key, e.target.value)
                                      }
                                      className="flex-1 text-xs"
                                    />
                                    <span className="text-xs text-muted-foreground py-2 px-2 bg-background rounded">
                                      {indicator.unit}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground mb-1">
                                  目标: {target !== null && target !== undefined ? `${target} ${indicator.unit}` : '不考核'}
                                </div>
                              )}

                              {editingMode?.employeeId === employee.id && editingMode?.mode === 'weights' ? (
                                <div className="mb-2">
                                  <label className="text-xs text-muted-foreground mb-1 block">
                                    权重占比
                                  </label>
                                  <div className="flex gap-2">
                                    <Input
                                      type="number"
                                      step="0.1"
                                      value={weightPercentage}
                                      onChange={(e) =>
                                        handleEmployeeWeightChange(employee.id, key, e.target.value)
                                      }
                                      className="flex-1 text-xs"
                                    />
                                    <span className="text-xs text-muted-foreground py-2 px-2 bg-background rounded">
                                      %
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground mb-1">
                                  权重: {weightPercentage.toFixed(2)}%
                                </div>
                              )}

                              <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">
                                  {target !== null && target !== 0
                                    ? `完成度: ${((actual / target) * 100).toFixed(1)}%`
                                    : '无目标'}
                                </span>
                                <span className="text-sm font-bold text-accent">
                                  得分: {score.toFixed(2)} / {weightPercentage.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    {/* 添加自定义考核项目 */}
                    <div className="border-t border-border pt-4">
                      {addingCustom?.employeeId === employee.id ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                            <Input
                              placeholder="项目名称"
                              value={addingCustom.name}
                              onChange={(e) =>
                                setAddingCustom({ ...addingCustom, name: e.target.value })
                              }
                            />
                            <Input
                              placeholder="单位"
                              value={addingCustom.unit}
                              onChange={(e) =>
                                setAddingCustom({ ...addingCustom, unit: e.target.value })
                              }
                            />
                            <Input
                              type="number"
                              placeholder="权重占比 %"
                              value={addingCustom.weight}
                              onChange={(e) =>
                                setAddingCustom({
                                  ...addingCustom,
                                  weight: parseFloat(e.target.value) || 0,
                                })
                              }
                            />
                            <div className="flex gap-2">
                              <Button
                                onClick={() => addCustomIndicator(employee.id)}
                                variant="default"
                                size="sm"
                              >
                                添加
                              </Button>
                              <Button
                                onClick={() => setAddingCustom(null)}
                                variant="outline"
                                size="sm"
                              >
                                取消
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <Button
                          onClick={() =>
                            setAddingCustom({
                              employeeId: employee.id,
                              name: '',
                              unit: '',
                              weight: 0,
                            })
                          }
                          variant="outline"
                          size="sm"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          添加考核项目
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>

            <div className="flex gap-4 justify-end">
              <Button onClick={exportToExcel} className="gap-2">
                <Download className="w-4 h-4" />
                导出为 CSV
              </Button>
            </div>
          </TabsContent>

          {/* 结果统计标签页 */}
          <TabsContent value="results" className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-foreground">KPI 成绩统计</h2>
              <Button onClick={exportToPDF} className="gap-2">
                <Download className="w-4 h-4" />
                导出 PDF 报告
              </Button>
            </div>

            {/* PDF 导出内容 */}
            <div ref={pdfRef} className="bg-white p-8 hidden" style={{ color: '#000' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
                KPI 成绩统计报告
              </h1>
              <p style={{ marginBottom: '30px', color: '#666' }}>
                生成时间: {new Date().toLocaleString()}
              </p>

              {/* 排名 */}
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px' }}>
                员工排名
              </h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '10px', textAlign: 'left' }}>排名</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>员工名称</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>得分</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>满分</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>完成度</th>
                  </tr>
                </thead>
                <tbody>
                  {employees
                    .map((emp) => ({
                      ...emp,
                      score: getEmployeeTotalScore(emp.id),
                      maxScore: getEmployeeTotalMaxScore(emp.id),
                    }))
                    .sort((a, b) => b.score - a.score)
                    .map((emp, index) => {
                      const percentage =
                        emp.maxScore > 0 ? (emp.score / emp.maxScore) * 100 : 0;
                      return (
                        <tr
                          key={emp.id}
                          style={{
                            borderBottom: '1px solid #eee',
                            backgroundColor: index % 2 === 0 ? '#f9f9f9' : '#fff',
                          }}
                        >
                          <td style={{ padding: '10px' }}>{index + 1}</td>
                          <td style={{ padding: '10px' }}>{emp.name}</td>
                          <td style={{ padding: '10px', textAlign: 'right' }}>
                            {emp.score.toFixed(2)}
                          </td>
                          <td style={{ padding: '10px', textAlign: 'right' }}>
                            {emp.maxScore.toFixed(2)}
                          </td>
                          <td style={{ padding: '10px', textAlign: 'right' }}>
                            {percentage.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>

              {/* 业务线分布 */}
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px' }}>
                员工业务线得分分布
              </h2>
              {employees.map((emp) => (
                <div key={emp.id} style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>
                    {emp.name}
                  </h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      {Object.entries(getCategoryScores(emp.id)).map(([category, score]) => (
                        <tr
                          key={category}
                          style={{ borderBottom: '1px solid #eee', backgroundColor: '#f9f9f9' }}
                        >
                          <td style={{ padding: '8px' }}>{category}</td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>
                            {(score as number).toFixed(2)} 分
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>

            {/* 排名（带进度条） */}
            <Card className="p-6">
              <h3 className="text-xl font-bold text-foreground mb-4">排名</h3>
              <div className="space-y-4">
                {employees
                  .map((emp) => ({
                    ...emp,
                    score: getEmployeeTotalScore(emp.id),
                    maxScore: getEmployeeTotalMaxScore(emp.id),
                  }))
                  .sort((a, b) => b.score - a.score)
                  .map((emp, index) => {
                    const percentage = emp.maxScore > 0 ? (emp.score / emp.maxScore) * 100 : 0;
                    return (
                      <div key={emp.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-primary w-8">#{index + 1}</span>
                            <span className="font-medium text-foreground">{emp.name}</span>
                          </div>
                          <span className="text-lg font-bold text-accent">{emp.score.toFixed(2)} / {emp.maxScore.toFixed(2)}</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-muted-foreground text-right">
                          完成度: {percentage.toFixed(1)}%
                        </div>
                      </div>
                    );
                  })}
              </div>
            </Card>

            {/* 员工业务线分布饼状图 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {employees.map((emp) => (
                <Card key={emp.id} className="p-6">
                  <h3 className="text-lg font-bold text-foreground mb-4">{emp.name} - 业务线分布</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={preparePieData(emp.id)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {preparePieData(emp.id).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
              ))}
            </div>

            {/* 业务线完成度排名 */}
            <Card className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-foreground mb-4">业务线完成度排名</h3>
                <div className="flex gap-2 flex-wrap">
                  {Object.keys(kpiStructure).map((category) => (
                    <Button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      variant={selectedCategory === category ? 'default' : 'outline'}
                      size="sm"
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              </div>

              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={prepareCategoryRankingData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="score" fill="#3b82f6" name="得分" />
                  <Bar dataKey="maxScore" fill="#d1d5db" name="满分" />
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-6 space-y-2">
                <h4 className="font-semibold text-foreground">排名详情</h4>
                {prepareCategoryRankingData().map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between p-3 bg-secondary rounded">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-primary w-8">#{index + 1}</span>
                      <span className="font-medium text-foreground">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-accent">{item.score.toFixed(2)} / {item.maxScore.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">{item.completion.toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
