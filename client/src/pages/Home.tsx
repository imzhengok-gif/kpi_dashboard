import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Plus, Trash2, Edit2 } from 'lucide-react';

interface KPIIndicator {
  name: string;
  target: number | null;
  weight: number;
  unit: string;
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
  targets: { [key: string]: number | null }; // 员工独立的目标值
  [key: string]: string | number | { [key: string]: number | null };
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
  const [weights, setWeights] = useState<{ [key: string]: { [key: string]: number } }>({});
  const [employees, setEmployees] = useState<EmployeeData[]>([
    { id: '1', name: '员工1', targets: {} },
    { id: '2', name: '员工2', targets: {} },
    { id: '3', name: '员工3', targets: {} },
    { id: '4', name: '员工4', targets: {} },
    { id: '5', name: '员工5', targets: {} },
    { id: '6', name: '员工6', targets: {} },
    { id: '7', name: '员工7', targets: {} },
    { id: '8', name: '员工8', targets: {} },
    { id: '9', name: '员工9', targets: {} },
    { id: '10', name: '员工10', targets: {} },
    { id: '11', name: '员工11', targets: {} },
  ]);
  const [editingWeights, setEditingWeights] = useState(false);
  const [editingTargets, setEditingTargets] = useState<string | null>(null);

  useEffect(() => {
    const fetchKPIStructure = async () => {
      try {
        const response = await fetch('/kpi_structure.json');
        const data: KPIStructure = await response.json();
        setKpiStructure(data);

        // 初始化权重（转换为百分比）
        const initialWeights: { [key: string]: { [key: string]: number } } = {};
        Object.entries(data).forEach(([category, categoryData]) => {
          initialWeights[category] = {};
          categoryData.指标.forEach((indicator) => {
            const key = indicator.name;
            initialWeights[category][key] = indicator.weight * 100;
          });
        });
        setWeights(initialWeights);

        // 初始化员工的目标值
        setEmployees((prevEmployees) =>
          prevEmployees.map((emp) => {
            const targets: { [key: string]: number | null } = {};
            Object.entries(data).forEach(([category, categoryData]) => {
              categoryData.指标.forEach((indicator) => {
                const key = `${category}_${indicator.name}`;
                targets[key] = indicator.target;
              });
            });
            return { ...emp, targets };
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
    // 如果目标值为空，实际值直接作为得分（不超过权重分）
    if (target === null || target === 0) {
      return Math.min(actual, weightPercentage);
    }
    // 否则按完成率计算
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
        const weightPercentage = weights[category]?.[indicator.name] || indicator.weight * 100;
        kpi[key] = {
          actual,
          score: calculateKPI(actual, target, weightPercentage),
          target,
        };
      });
    });

    return kpi;
  };

  // 计算员工总分
  const getEmployeeTotalScore = (employeeId: string) => {
    const kpi = getEmployeeKPI(employeeId);
    return Object.values(kpi).reduce((sum, item) => sum + item.score, 0);
  };

  // 获取总满分
  const getTotalMaxScore = () => {
    return Object.values(weights)
      .flatMap((cat) => Object.values(cat))
      .reduce((sum, w) => sum + w, 0);
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

  // 添加员工
  const addEmployee = () => {
    const newId = String(Math.max(...employees.map(e => parseInt(e.id))) + 1);
    const targets: { [key: string]: number | null } = {};
    if (kpiStructure) {
      Object.entries(kpiStructure).forEach(([category, categoryData]) => {
        categoryData.指标.forEach((indicator) => {
          const key = `${category}_${indicator.name}`;
          targets[key] = indicator.target;
        });
      });
    }
    setEmployees([...employees, { id: newId, name: `员工${newId}`, targets }]);
  };

  // 删除员工
  const removeEmployee = (employeeId: string) => {
    if (employees.length > 1) {
      setEmployees(employees.filter((emp) => emp.id !== employeeId));
    }
  };

  // 处理权重变更（百分比形式）
  const handleWeightChange = (category: string, indicatorName: string, value: string) => {
    const newWeight = parseFloat(value) || 0;
    setWeights({
      ...weights,
      [category]: {
        ...weights[category],
        [indicatorName]: newWeight,
      },
    });
  };

  // 导出为 Excel
  const exportToExcel = () => {
    if (!kpiStructure) return;

    let csv = '员工名称';

    Object.entries(kpiStructure).forEach(([category, categoryData]) => {
      categoryData.指标.forEach((indicator) => {
        csv += `,${category}_${indicator.name}(实际),${category}_${indicator.name}(目标),${category}_${indicator.name}(得分)`;
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
          const score = kpi[key]?.score || 0;
          csv += `,${actual},${target},${score}`;
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

  const totalMaxScore = getTotalMaxScore();

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
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="data-input">数据输入</TabsTrigger>
            <TabsTrigger value="weight-config">权重配置</TabsTrigger>
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

            <div className="space-y-6">
              {employees.map((employee) => (
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
                        {getEmployeeTotalScore(employee.id).toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">/ {totalMaxScore.toFixed(2)}</div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {editingTargets === employee.id ? (
                        <Button
                          onClick={() => setEditingTargets(null)}
                          variant="default"
                          size="sm"
                        >
                          完成
                        </Button>
                      ) : (
                        <Button
                          onClick={() => setEditingTargets(employee.id)}
                          variant="outline"
                          size="sm"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      )}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(kpiStructure).map(([category, categoryData]) =>
                      categoryData.指标.map((indicator) => {
                        const key = `${category}_${indicator.name}`;
                        const actual = parseFloat(String(employee[key] || 0));
                        const kpi = getEmployeeKPI(employee.id);
                        const score = kpi[key]?.score || 0;
                        const target = kpi[key]?.target;
                        const weightPercentage = weights[category]?.[indicator.name] || indicator.weight * 100;

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
                            {editingTargets === employee.id ? (
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
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex gap-4 justify-end">
              <Button onClick={exportToExcel} className="gap-2">
                <Download className="w-4 h-4" />
                导出为 CSV
              </Button>
            </div>
          </TabsContent>

          {/* 权重配置标签页 */}
          <TabsContent value="weight-config" className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-foreground">权重配置（全局）</h2>
              {!editingWeights ? (
                <Button onClick={() => setEditingWeights(true)} variant="outline">
                  编辑权重
                </Button>
              ) : (
                <Button onClick={() => setEditingWeights(false)} variant="default">
                  完成编辑
                </Button>
              )}
            </div>

            <div className="space-y-8">
              {Object.entries(kpiStructure).map(([category, categoryData]) => {
                const categoryTotal = Object.values(weights[category] || {}).reduce(
                  (sum, w) => sum + w,
                  0
                );

                return (
                  <Card key={category} className="p-6">
                    <h3 className="text-xl font-bold text-foreground mb-4">{category}</h3>
                    <div className="space-y-4">
                      {categoryData.指标.map((indicator) => {
                        const weight = weights[category]?.[indicator.name] || indicator.weight * 100;

                        return (
                          <div key={indicator.name} className="flex items-center justify-between">
                            <div className="flex-1">
                              <label className="block text-sm font-medium text-foreground">
                                {indicator.name}
                              </label>
                              <p className="text-xs text-muted-foreground">
                                默认目标: {indicator.target !== null && indicator.target !== 0 ? `${indicator.target} ${indicator.unit}` : '不考核'}
                              </p>
                            </div>
                            {editingWeights ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={weight}
                                  onChange={(e) =>
                                    handleWeightChange(category, indicator.name, e.target.value)
                                  }
                                  className="w-24"
                                />
                                <span className="text-sm text-muted-foreground">%</span>
                              </div>
                            ) : (
                              <div className="text-right">
                                <div className="text-lg font-bold text-primary">{weight.toFixed(2)}%</div>
                                <p className="text-xs text-muted-foreground">权重占比</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-foreground">分类总权重</span>
                        <span className={`text-lg font-bold ${categoryTotal > 100 ? 'text-destructive' : 'text-primary'}`}>
                          {categoryTotal.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            <Card className="p-6 bg-secondary">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-foreground">全部权重总和（总满分）</span>
                <span className="text-2xl font-bold text-primary">
                  {totalMaxScore.toFixed(2)} 分
                </span>
              </div>
            </Card>
          </TabsContent>

          {/* 结果统计标签页 */}
          <TabsContent value="results" className="space-y-6">
            <h2 className="text-2xl font-bold text-foreground mb-6">KPI 成绩统计</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {employees.map((employee) => {
                const totalScore = getEmployeeTotalScore(employee.id);
                const completionRate = (totalScore / totalMaxScore) * 100;

                return (
                  <Card key={employee.id} className="p-6 border-l-4 border-l-primary">
                    <h3 className="text-lg font-bold text-foreground mb-2">{employee.name}</h3>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-muted-foreground">得分</p>
                        <p className="text-3xl font-bold text-primary">{totalScore.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">满分</p>
                        <p className="text-lg font-semibold text-foreground">{totalMaxScore.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">完成度</p>
                        <p className="text-lg font-semibold text-accent">
                          {completionRate.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            <Card className="p-6">
              <h3 className="text-xl font-bold text-foreground mb-4">排名</h3>
              <div className="space-y-3">
                {employees
                  .map((emp) => ({
                    ...emp,
                    score: getEmployeeTotalScore(emp.id),
                  }))
                  .sort((a, b) => b.score - a.score)
                  .map((emp, index) => (
                    <div key={emp.id} className="flex items-center justify-between p-3 bg-secondary rounded">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-primary w-8">{index + 1}</span>
                        <span className="font-medium text-foreground">{emp.name}</span>
                      </div>
                      <span className="text-lg font-bold text-accent">{emp.score.toFixed(2)} 分</span>
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
