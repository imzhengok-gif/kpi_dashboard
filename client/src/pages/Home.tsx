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
  enabledIndicators?: { [key: string]: boolean };
  customIndicatorNames?: { [key: string]: string };
  customIndicatorUnits?: { [key: string]: string };
  [key: string]: any;
}

interface EmployeeKPI {
  [key: string]: {
    actual: number;
    score: number;
    target: number | null;
  };
}

// LocalStorage 工具函数
const STORAGE_KEY = 'kpi_dashboard_employees';
const STORAGE_VERSION = '1.0';

const saveToLocalStorage = (data: EmployeeData[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    console.log('✅ Data saved to LocalStorage');
    return true;
  } catch (error) {
    console.error('❌ Failed to save to LocalStorage:', error);
    return false;
  }
};

const loadFromLocalStorage = (): EmployeeData[] | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      console.log('✅ Data loaded from LocalStorage');
      return parsed;
    }
  } catch (error) {
    console.error('❌ Failed to load from LocalStorage:', error);
  }
  return null;
};

const getInitialEmployees = (): EmployeeData[] => {
  // 首先尝试从LocalStorage加载
  const savedData = loadFromLocalStorage();
  if (savedData && savedData.length > 0) {
    return savedData;
  }
  
  // 如果没有保存的数据，使用默认数据
  return [
    { id: '1', name: '员工1', targets: {}, weights: {}, customIndicators: {}, enabledIndicators: {} },
    { id: '2', name: '员工2', targets: {}, weights: {}, customIndicators: {}, enabledIndicators: {} },
    { id: '3', name: '员工3', targets: {}, weights: {}, customIndicators: {}, enabledIndicators: {} },
    { id: '4', name: '员工4', targets: {}, weights: {}, customIndicators: {}, enabledIndicators: {} },
    { id: '5', name: '员工5', targets: {}, weights: {}, customIndicators: {}, enabledIndicators: {} },
    { id: '6', name: '员工6', targets: {}, weights: {}, customIndicators: {}, enabledIndicators: {} },
    { id: '7', name: '员工7', targets: {}, weights: {}, customIndicators: {}, enabledIndicators: {} },
    { id: '8', name: '员工8', targets: {}, weights: {}, customIndicators: {}, enabledIndicators: {} },
    { id: '9', name: '员工9', targets: {}, weights: {}, customIndicators: {}, enabledIndicators: {} },
    { id: '10', name: '员工10', targets: {}, weights: {}, customIndicators: {}, enabledIndicators: {} },
    { id: '11', name: '员工11', targets: {}, weights: {}, customIndicators: {}, enabledIndicators: {} },
  ];

};

export default function Home() {
  const [kpiStructure, setKpiStructure] = useState<KPIStructure | null>(null);
  const [employees, setEmployees] = useState<EmployeeData[]>(getInitialEmployees());
  const [isLoaded, setIsLoaded] = useState(false);
  const [editingMode, setEditingMode] = useState<{ employeeId: string; mode: 'targets' | 'weights' } | null>(null);
  const [batchMode, setBatchMode] = useState<{ sourceId: string; type: 'weights' | 'targets' } | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [copySuccess, setCopySuccess] = useState(false);
  const [addingCustom, setAddingCustom] = useState<{ employeeId: string; name: string; unit: string; weight: number } | null>(null);
  const [managingIndicators, setManagingIndicators] = useState<string | null>(null);
  const [selectedIndicatorForRanking, setSelectedIndicatorForRanking] = useState<string | null>(null);
  const [selectedEmployeeForDetail, setSelectedEmployeeForDetail] = useState<string | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

    // 自动保存员工数据到LocalStorage和后端
  useEffect(() => {
    if (employees.length === 0 || !isLoaded) return;
    
    // 1. 首先保存到LocalStorage（最重要，最稳定）
    const localSaveSuccess = saveToLocalStorage(employees);
    
    // 2. 同时尝试保存到后端（作为备份）
    fetch('/api/employees/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(employees),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          console.log('✅ Auto-saved to backend');
        }
      })
      .catch(err => console.error('⚠️ Backend auto-save failed (data still saved locally):', err));
  }, [employees, isLoaded]);

  // 加载员工数据（优先从LocalStorage，然后从后端）
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        // 1. 首先尝试从LocalStorage加载（最快，最稳定）
        const localData = loadFromLocalStorage();
        if (localData && localData.length > 0) {
          setEmployees(localData);
          setIsLoaded(true);
          console.log('✅ Loaded from LocalStorage');
          return;
        }
        
        // 2. 如果LocalStorage没有数据，尝试从后端加载
        console.log('LocalStorage empty, trying backend...');
        const res = await fetch('/api/employees/load');
        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) {
          console.log('✅ Loaded from backend');
          setEmployees(data.data);
          // 同时保存到LocalStorage
          saveToLocalStorage(data.data);
        }
        setIsLoaded(true);
      } catch (error) {
        console.error('Failed to load employees:', error);
        setIsLoaded(true);
      }
    };
    loadEmployees();
  }, []);

  useEffect(() => {
    const fetchKPIStructure = async () => {
      try {
        const response = await fetch('/kpi_structure.json');
        const data: KPIStructure = await response.json();
        setKpiStructure(data);

        // 只在已加载文件数据后，才初始化权重和目标值
        if (isLoaded) {
          setEmployees((prevEmployees) =>
            prevEmployees.map((emp) => {
              // 如果已经有权重，说明是从文件加载的，不需要初始化
              if (Object.keys(emp.weights).length > 0) {
                return emp;
              }
              const targets: { [key: string]: number | null } = {};
              const weights: { [key: string]: number } = {};
              const enabledIndicators: { [key: string]: boolean } = {};
              Object.entries(data).forEach(([category, categoryData]) => {
                categoryData.指标.forEach((indicator) => {
                  const key = `${category}_${indicator.name}`;
                  targets[key] = indicator.target;
                  weights[key] = indicator.weight * 100;
                  enabledIndicators[key] = true;
                });
              });
              return { ...emp, targets, weights, customIndicators: {}, enabledIndicators };
            })
          );
        }
      } catch (error) {
        console.error('Failed to load KPI structure:', error);
      }
    };

    fetchKPIStructure();
  }, [isLoaded]);

  // 计算 KPI 得分
  const calculateKPI = (actual: number, target: number | null, weightPercentage: number) => {
    if (target === null || target === 0) {
      // 最低分为0分，最多保留四位小数
      return Math.max(0, Math.min(actual, weightPercentage));
    }
    const completion = actual / target;
    // 最低分为0分，最高不超过权重，最多保留四位小数
    const score = Math.max(0, Math.min(completion * weightPercentage, weightPercentage));
    return Math.round(score * 10000) / 10000;
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
        const isEnabled = employee.enabledIndicators?.[key] ?? true;
        if (!isEnabled) return;

        const actualValue = employee[key];
        const actual = actualValue === null || actualValue === undefined ? null : parseFloat(String(actualValue));
        const target = employee.targets[key] ?? indicator.target;
        const weightPercentage = employee.weights[key] ?? indicator.weight * 100;
        kpi[key] = {
          actual: actual ?? 0,
          score: actual === null ? 0 : calculateKPI(actual, target, weightPercentage),
          target,
        };
      });
    });

    // 添加自定义指标
    if (employee.customIndicators) {
      Object.entries(employee.customIndicators).forEach(([key, indicator]) => {
        const actualValue = employee[key];
        const actual = actualValue === null || actualValue === undefined ? null : parseFloat(String(actualValue));
        const target = employee.targets[key] ?? indicator.target;
        const weightPercentage = employee.weights[key] ?? indicator.weight;
        kpi[key] = {
          actual: actual ?? 0,
          score: actual === null ? 0 : calculateKPI(actual, target, weightPercentage),
          target,
        };
      });
    }

    return kpi;
  };

  // 计算员工总分
  const getEmployeeTotalScore = (employeeId: string) => {
    const kpi = getEmployeeKPI(employeeId);
    const total = Object.values(kpi).reduce((sum, item) => sum + item.score, 0);
    return Math.round(total * 10000) / 10000;
  };

  // 获取员工的总满分
  const getEmployeeTotalMaxScore = (employeeId: string) => {
    const employee = employees.find((e) => e.id === employeeId);
    if (!employee) return 0;
    if (!kpiStructure) return 0;

    let maxScore = 0;
    Object.entries(kpiStructure).forEach(([category, categoryData]) => {
      categoryData.指标.forEach((indicator) => {
        const key = `${category}_${indicator.name}`;
        const isEnabled = employee.enabledIndicators?.[key] ?? true;
        if (isEnabled) {
          maxScore += employee.weights[key] ?? indicator.weight * 100;
        }
      });
    });

    if (employee.customIndicators) {
      Object.values(employee.customIndicators).forEach((indicator) => {
        maxScore += indicator.weight;
      });
    }

    return maxScore;
  };

  // 获取所有指标
  const getAllIndicators = () => {
    const indicators: Array<{ key: string; name: string; unit: string }> = [];
    if (kpiStructure) {
      Object.entries(kpiStructure).forEach(([category, categoryData]) => {
        categoryData.指标.forEach((indicator) => {
          const key = `${category}_${indicator.name}`;
          // 优先使用第一个员工的自定义名称和单位（作为全局同步源）
          const firstEmp = employees[0];
          const customName = (firstEmp?.customIndicatorNames as any)?.[key] || indicator.name;
          const customUnit = (firstEmp?.customIndicatorUnits as any)?.[key] || indicator.unit || '';
          
          indicators.push({
            key,
            name: customName,
            unit: customUnit,
          });
        });
      });
    }
    employees.forEach((employee) => {
      if (employee.customIndicators) {
        Object.entries(employee.customIndicators).forEach(([key, indicator]) => {
          if (!indicators.find((i) => i.key === key)) {
            indicators.push({
              key,
              name: indicator.name,
              unit: indicator.unit || '',
            });
          }
        });
      }
    });
    return indicators;
  };

  // 获取单项指标的排名
  const getIndicatorRanking = (indicatorKey: string) => {
    const ranking = employees
      .map((employee) => {
        const kpi = getEmployeeKPI(employee.id);
        const indicatorData = kpi[indicatorKey];
        if (!indicatorData) {
          return null;
        }
        return {
          employeeId: employee.id,
          employeeName: employee.name,
          score: indicatorData.score,
          completionRate: indicatorData.target && indicatorData.target !== 0
            ? (indicatorData.actual / indicatorData.target) * 100
            : 0,
        };
      })
      .filter((item) => item !== null)
      .sort((a, b) => {
        // 分数一样的情况下，以完成度排名
        if (b!.score === a!.score) {
          return b!.completionRate - a!.completionRate;
        }
        return b!.score - a!.score;
      }) as Array<{
        employeeId: string;
        employeeName: string;
        score: number;
        completionRate: number;
      }>;
    return ranking;
  };

  // 处理员工数据输入
  const handleEmployeeDataChange = (employeeId: string, key: string, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    setEmployees(
      employees.map((emp) =>
        emp.id === employeeId ? { ...emp, [key]: isNaN(numValue as number) ? null : numValue } : emp
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

  // 处理指标名称变更（同步到所有员工）
  const handleIndicatorNameChange = (indicatorKey: string, newName: string) => {
    setEmployees(
      employees.map((emp) => ({
        ...emp,
        customIndicatorNames: {
          ...((emp.customIndicatorNames as object) || {}),
          [indicatorKey]: newName,
        },
      }))
    );
  };

  // 处理指标单位变更（同步到所有员工）
  const handleIndicatorUnitChange = (indicatorKey: string, newUnit: string) => {
    setEmployees(
      employees.map((emp) => ({
        ...emp,
        customIndicatorUnits: {
          ...((emp.customIndicatorUnits as object) || {}),
          [indicatorKey]: newUnit,
        },
      }))
    );
  };

  // 切换指标启用状态
  const toggleIndicatorEnabled = (employeeId: string, indicatorKey: string) => {
    setEmployees(
      employees.map((emp) =>
        emp.id === employeeId
          ? {
              ...emp,
              enabledIndicators: {
                ...emp.enabledIndicators,
                [indicatorKey]: !(emp.enabledIndicators?.[indicatorKey] ?? true),
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
    const enabledIndicators: { [key: string]: boolean } = {};
    if (kpiStructure) {
      Object.entries(kpiStructure).forEach(([category, categoryData]) => {
        categoryData.指标.forEach((indicator) => {
          const key = `${category}_${indicator.name}`;
          targets[key] = indicator.target;
          weights[key] = indicator.weight * 100;
          enabledIndicators[key] = true;
        });
      });
    }
    setEmployees([...employees, { id: newId, name: `员工${newId}`, targets, weights, customIndicators: {}, enabledIndicators }]);
  };

  // 删除员工
  const removeEmployee = (employeeId: string) => {
    if (employees.length > 1) {
      setEmployees(employees.filter((emp) => emp.id !== employeeId));
      selectedEmployees.delete(employeeId);
    }
  };

  // 导出为 Excel
  const saveData = () => {
    if (!kpiStructure) return;

    const ws_data: any[] = [];
    
    // 表头：员工名称 + 各指标(实际值、目标值、权重%、得分)
    const headers = ['员工名称'];
    const allIndicators = getAllIndicators();
    Object.entries(kpiStructure).forEach(([category, categoryData]) => {
      categoryData.指标.forEach((indicator) => {
        const key = `${category}_${indicator.name}`;
        const currentIndicator = allIndicators.find(i => i.key === key) || indicator;
        headers.push(`${currentIndicator.name}(实际)`);
        headers.push(`${currentIndicator.name}(目标)`);
        headers.push(`${currentIndicator.name}(权重%)`);
        headers.push(`${currentIndicator.name}(得分)`);
        headers.push(`${currentIndicator.name}(单位)`); // 导出单位以便导入时同步
      });
    });
    headers.push('总分');
    ws_data.push(headers);

    // 员工行 - 填充完整数据
    employees.forEach((emp) => {
      const row: any[] = [emp.name];
      const kpi = getEmployeeKPI(emp.id);
      Object.entries(kpiStructure).forEach(([category, categoryData]) => {
        categoryData.指标.forEach((indicator) => {
          const key = `${category}_${indicator.name}`;
          const currentIndicator = allIndicators.find(i => i.key === key) || indicator;
          const actual = kpi[key]?.actual || 0;
          const target = kpi[key]?.target ?? '';
          const weight = emp.weights[key] ?? 0;
          const score = kpi[key]?.score || 0;
          // 导出时确保数值最多保留四位小数
          row.push(typeof actual === 'number' ? Math.round(actual * 10000) / 10000 : actual);
          row.push(typeof target === 'number' ? Math.round(target * 10000) / 10000 : target);
          row.push(typeof weight === 'number' ? Math.round(weight * 10000) / 10000 : weight);
          row.push(typeof score === 'number' ? Math.round(score * 10000) / 10000 : score);
          row.push(currentIndicator.unit);
        });
      });
      row.push(getEmployeeTotalScore(emp.id));
      ws_data.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'KPI数据');
    XLSX.writeFile(wb, `KPI数据_${new Date().toISOString().split('T')[0]}.xlsx`);
  };
  // 保存数据到文件
  const saveToFile = () => {
    // 保存到LocalStorage
    const localSaveSuccess = saveToLocalStorage(employees);
    
    // 显示提示框
    if (localSaveSuccess) {
      alert('✅ 数据保存成功！');
      console.log('✅ Data saved successfully');
    } else {
      alert('❌ 数据保存失败！');
      console.error('Save failed');
    }
  };



  // 导入 Excel 数据 - 完全替换现有数据
  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !kpiStructure) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[];

        if (jsonData.length < 2) {
          alert('Excel 文件格式不正确');
          return;
        }

        const headers = jsonData[0];
        // 完全替换现有数据
        const newEmployees: EmployeeData[] = [];
        
        // 从Excel中读取所有员工数据
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          const employeeName = row[0];
          if (!employeeName) continue;
          
          // 查找或创建员工
          let employee = employees.find(e => e.name === employeeName);
          if (!employee) {
            const newId = String(Math.max(...employees.map(e => parseInt(e.id)), 0) + newEmployees.length + 1);
            employee = {
              id: newId,
              name: employeeName,
              targets: {},
              weights: {},
              customIndicators: {},
              enabledIndicators: {}
            };
          } else {
            // 重置员工数据
            employee = {
              ...employee,
              targets: {},
              weights: {},
              customIndicators: {},
              enabledIndicators: {}
            };
          }
                    // 填充指标数据
          Object.entries(kpiStructure).forEach(([category, categoryData]) => {
            categoryData.指标.forEach((indicator) => {
              const key = `${category}_${indicator.name}`;
              
              // 尝试匹配表头（支持原始名称和自定义名称）
              const findHeaderIndex = (suffix: string) => {
                // 1. 尝试匹配原始名称
                let idx = headers.indexOf(`${category}_${indicator.name}${suffix}`);
                if (idx !== -1) return idx;
                
                // 2. 尝试模糊匹配（只要包含后缀且在合适位置）
                return headers.findIndex((h: string) => h && h.endsWith(suffix));
              };

              // 导入实际值
              const actualHeaderIndex = findHeaderIndex('(实际)');
              if (actualHeaderIndex !== -1 && row[actualHeaderIndex] !== undefined && row[actualHeaderIndex] !== null) {
                const value = row[actualHeaderIndex];
                if (value !== '(不考核)' && value !== '') {
                  const parsed = parseFloat(value);
                  employee[key] = isNaN(parsed) ? null : Math.round(parsed * 10000) / 10000;
                }
              }
              
              // 导入目标值
              const targetHeaderIndex = findHeaderIndex('(目标)');
              if (targetHeaderIndex !== -1 && row[targetHeaderIndex] !== undefined && row[targetHeaderIndex] !== null) {
                const value = row[targetHeaderIndex];
                if (value !== '' && value !== undefined) {
                  const parsed = parseFloat(value);
                  employee.targets[key] = isNaN(parsed) ? null : Math.round(parsed * 10000) / 10000;
                }
              }
              
              // 导入权重
              const weightHeaderIndex = findHeaderIndex('(权重%)');
              if (weightHeaderIndex !== -1 && row[weightHeaderIndex] !== undefined && row[weightHeaderIndex] !== null) {
                const value = row[weightHeaderIndex];
                if (value !== '' && value !== undefined) {
                  const parsed = parseFloat(value);
                  employee.weights[key] = isNaN(parsed) ? 0 : Math.round(parsed * 10000) / 10000;
                }
              }

              // 导入名称和单位（同步到 customIndicatorNames/Units）
              const nameHeader = headers.find((h: string) => h && h.endsWith('(实际)'));
              if (nameHeader) {
                const customName = nameHeader.replace('(实际)', '');
                if (!employee.customIndicatorNames) employee.customIndicatorNames = {};
                (employee.customIndicatorNames as any)[key] = customName;
              }

              const unitHeaderIndex = findHeaderIndex('(单位)');
              if (unitHeaderIndex !== -1 && row[unitHeaderIndex]) {
                if (!employee.customIndicatorUnits) employee.customIndicatorUnits = {};
                (employee.customIndicatorUnits as any)[key] = String(row[unitHeaderIndex]);
              }

              if (employee.weights[key] === undefined) {
                // 如果表格中没有权重且员工原本也没有该权重，则使用面板默认权重
                employee.weights[key] = indicator.weight * 100;
              }
              
              // 设置启用状态
              if (!employee.enabledIndicators) employee.enabledIndicators = {};
              employee.enabledIndicators[key] = true;
            });
          });
          
          newEmployees.push(employee);
        }
        
        // 完全替换员工列表
        if (newEmployees.length > 0) {
          setEmployees(newEmployees);
          // 立即保存到LocalStorage
          saveToLocalStorage(newEmployees);
          alert(`✅ 数据导入成功！已导入 ${newEmployees.length} 名员工的数据（已自动保存）`);
        } else {
          alert('❌ 未找到有效的员工数据');
        }
      } catch (error) {
        console.error('Import error:', error);
        alert('❌ 导入失败，请检查文件格式');
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 导出为 CSV


  // 导出为 PDF
  const exportToPDF = (mode: 'data' | 'visual' = 'data') => {
    if (!pdfRef.current) return;

    const element = pdfRef.current;
    const printWindow = window.open('', '', 'width=1000,height=800');
    if (!printWindow) return;

    // 获取当前页面的所有样式
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(style => style.outerHTML)
      .join('\n');

    const content = element.innerHTML;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>KPI 成绩报告</title>
          ${mode === 'visual' ? styles : ''}
          <style>
            @media print {
              body { padding: 20px; color: #000; background: #fff; }
              .no-print { display: none !important; }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
              h1, h2, h3 { page-break-after: avoid; }
              ${mode === 'data' ? `
                table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
                th { background-color: #f2f2f2; }
              ` : ''}
            }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
            ${mode === 'data' ? `
              .visual-only { display: none !important; }
              table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
              th { background-color: #f2f2f2; }
            ` : ''}
          </style>
        </head>
        <body>
          <div class="${mode === 'data' ? 'pure-data-mode' : 'visual-mode'}">
            ${content}
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
              <div className="flex gap-2">
                <Button onClick={addEmployee} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  添加员工
                </Button>
                <Button onClick={saveData} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  导出数据
                </Button>
                <Button onClick={saveToFile} variant="default" size="sm">
                  <Save className="w-4 h-4 mr-2" />
                  保存数据
                </Button>
                <Button onClick={() => fileInputRef.current?.click()} variant="outline" size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  导入数据
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </div>
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
                          onClick={() => setManagingIndicators(managingIndicators === employee.id ? null : employee.id)}
                          variant="outline"
                          size="sm"
                          title="管理考核项目"
                        >
                          <List className="w-4 h-4" />
                        </Button>
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

                    {/* 管理考核项目面板 */}
                    {managingIndicators === employee.id && (
                      <Card className="p-4 mb-6 bg-secondary/50 border-accent">
                        <h4 className="font-semibold text-foreground mb-4">管理考核项目</h4>
                        <div className="space-y-4">
                          {/* 原考核项目 */}
                          <div>
                            <h5 className="text-sm font-medium text-muted-foreground mb-2">原考核项目</h5>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                              {Object.entries(kpiStructure).map(([category, categoryData]) =>
                                categoryData.指标.map((indicator) => {
                                  const key = `${category}_${indicator.name}`;
                                  const isEnabled = employee.enabledIndicators?.[key] ?? true;
                                  return (
                                    <div
                                      key={key}
                                      className="flex items-center gap-2 p-3 bg-background rounded border border-border"
                                    >
                                      <Checkbox
                                        checked={isEnabled}
                                        onCheckedChange={() => toggleIndicatorEnabled(employee.id, key)}
                                      />
                                      <label className="text-sm font-medium text-foreground cursor-pointer flex-1">
                                        {indicator.name}
                                      </label>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>

                          {/* 自定义考核项目 */}
                          {employee.customIndicators && Object.keys(employee.customIndicators).length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium text-muted-foreground mb-2">自定义考核项目</h5>
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {Object.entries(employee.customIndicators).map(([key, indicator]) => (
                                  <div
                                    key={key}
                                    className="flex items-center gap-2 p-3 bg-background rounded border border-border"
                                  >
                                    <span className="text-sm font-medium text-foreground flex-1">
                                      {indicator.name}
                                    </span>
                                    <Button
                                      onClick={() => removeCustomIndicator(employee.id, key)}
                                      variant="ghost"
                                      size="sm"
                                      className="p-0 h-auto"
                                    >
                                      <X className="w-4 h-4 text-destructive" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    )}

                    {/* 指标输入网格 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                      {Object.entries(kpiStructure).map(([category, categoryData]) =>
                        categoryData.指标.map((indicator) => {
                          const key = `${category}_${indicator.name}`;
                          const isEnabled = employee.enabledIndicators?.[key] ?? true;
                          if (!isEnabled) return null;

                          const actual = parseFloat(String(employee[key] || 0));
                          const kpi = getEmployeeKPI(employee.id);
                          const score = kpi[key]?.score || 0;
                          const target = kpi[key]?.target;
                          const weightPercentage = employee.weights[key] ?? indicator.weight * 100;

	                          const currentIndicator = getAllIndicators().find(i => i.key === key) || { name: indicator.name, unit: indicator.unit };
	                          return (
	                            <div key={key} className="bg-secondary p-4 rounded-lg">
	                              <div className="flex justify-between items-start mb-2">
	                                <Input
	                                  className="text-sm font-medium bg-transparent border-none p-0 h-auto focus-visible:ring-0 w-full"
	                                  value={currentIndicator.name}
	                                  onChange={(e) => handleIndicatorNameChange(key, e.target.value)}
	                                />
	                              </div>
                              <div className="flex gap-2 mb-2">
                                <Input
                                  type="number"
                                  step="any"
                                  placeholder="实际值"
                                  value={actual !== null && actual !== undefined ? actual : ''}
                                  onChange={(e) =>
                                    handleEmployeeDataChange(employee.id, key, e.target.value)
                                  }
                                  className="flex-1"
                                />
	                                <Input
	                                  className="text-sm text-muted-foreground py-1 px-2 bg-background rounded w-16 h-auto border-none text-center"
	                                  value={currentIndicator.unit}
	                                  onChange={(e) => handleIndicatorUnitChange(key, e.target.value)}
	                                />
                              </div>

                              {/* 目标值编辑 */}
                              {editingMode?.employeeId === employee.id && editingMode?.mode === 'targets' ? (
                                <div className="mb-2">
                                  <div className="flex gap-2">
                                    <Input
                                      type="number"
                                      step="any"
                                      placeholder="留空表示不考核"
                                      value={target ?? ''}
                                      onChange={(e) =>
                                        handleEmployeeTargetChange(employee.id, key, e.target.value)
                                      }
                                      className="flex-1 text-xs"
                                    />
	                                    <span className="text-xs text-muted-foreground py-2 px-2 bg-background rounded">
	                                      {currentIndicator.unit}
	                                    </span>
                                  </div>
                                </div>
                              ) : null}

                              {/* 权重编辑 */}
                              {editingMode?.employeeId === employee.id && editingMode?.mode === 'weights' ? (
                                <div className="mb-2">
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
                              ) : null}

                              <div className="space-y-2">
                                <div className="flex justify-between items-center text-xs mb-1">
                                  <span className="text-muted-foreground">目标: {target !== null && target !== undefined ? target : '—'}</span>
                                  <span className="text-muted-foreground">权重: {weightPercentage.toFixed(2)}%</span>
                                </div>
                                <div className="w-full bg-background rounded-full h-2 overflow-hidden">
                                  <div
                                    className="h-full bg-accent transition-all duration-300"
                                    style={{
                                      width: target !== null && target !== 0
                                        ? Math.max(0, Math.min(((actual / target) * 100), 100)) + '%'
                                        : '0%',
                                    }}
                                  />
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                  <span className="font-medium text-foreground">
                                    {score.toFixed(2)}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {target !== null && target !== 0
                                      ? `${Math.max(0, (actual / target) * 100).toFixed(0)}%`
                                      : '—'}
                                  </span>
                                </div>
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
                            <div key={key} className="bg-secondary p-4 rounded-lg">
                              <div className="flex justify-between items-start mb-2">
                                <label className="block text-sm font-medium text-foreground">
                                  {indicator.name}
                                </label>
                              </div>
                              <div className="flex gap-2 mb-2">
                                <Input
                                  type="number"
                                  step="any"
                                  placeholder="实际值"
                                  value={actual !== null && actual !== undefined ? actual : ''}
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
                                      step="any"
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

                              <div className="space-y-2">
                                <div className="flex justify-between items-center text-xs mb-1">
                                  <span className="text-muted-foreground">目标: {target !== null && target !== undefined ? target : '—'}</span>
                                  <span className="text-muted-foreground">权重: {weightPercentage.toFixed(2)}%</span>
                                </div>
                                <div className="w-full bg-background rounded-full h-2 overflow-hidden">
                                  <div
                                    className="h-full bg-accent transition-all duration-300"
                                    style={{
                                      width: target !== null && target !== 0
                                        ? Math.max(0, Math.min(((actual / target) * 100), 100)) + '%'
                                        : '0%',
                                    }}
                                  />
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                  <span className="font-medium text-foreground">
                                    {score.toFixed(2)}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {target !== null && target !== 0
                                      ? `${Math.max(0, (actual / target) * 100).toFixed(0)}%`
                                      : '—'}
                                  </span>
                                </div>
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


          </TabsContent>

          {/* 结果统计标签页 */}
          <TabsContent value="results" className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-foreground">KPI 成绩统计</h2>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="gap-2">
                    <Download className="w-4 h-4" />
                    导出 PDF 报告
                    <ChevronDown className="w-4 h-4 ml-1 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => exportToPDF('data')} className="gap-2 cursor-pointer">
                    <FileText className="w-4 h-4" />
                    <span>导出纯数据版本</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportToPDF('visual')} className="gap-2 cursor-pointer">
                    <BarChart2 className="w-4 h-4" />
                    <span>导出带可视化版本</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* 单项指标排名选择 */}
            <Card className="p-6 mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">单项指标排名</h3>
              <div className="mb-4">
                <label className="text-sm font-medium text-foreground mb-2 block">
                  选择考核指标
                </label>
                <select
                  value={selectedIndicatorForRanking || ''}
                  onChange={(e) => setSelectedIndicatorForRanking(e.target.value || null)}
                  className="w-full p-2 border border-border rounded bg-background text-foreground"
                >
                  <option value="">—— 请选择指标 ——</option>
                  {getAllIndicators().map((indicator) => (
                    <option key={indicator.key} value={indicator.key}>
                      {indicator.name} {indicator.unit ? `(${indicator.unit})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {selectedIndicatorForRanking && (
                <div>
                  <h4 className="font-semibold text-foreground mb-4">
                    {getAllIndicators().find((i) => i.key === selectedIndicatorForRanking)?.name} - 员工排名
                  </h4>
                  <div className="space-y-2">
                                        {getIndicatorRanking(selectedIndicatorForRanking).map((item, index) => {
                      const employee = employees.find(e => e.id === item.employeeId);
                      const indicatorKey = selectedIndicatorForRanking;
                      const actualValue = employee ? parseFloat(String(employee[indicatorKey] || 0)) : 0;
                      const targetValue = employee?.targets[indicatorKey];
                      return (
                        <div
                          key={item.employeeId}
                          className="flex items-center justify-between p-4 bg-secondary rounded border border-border"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <span className="font-bold text-accent text-lg w-8">{index + 1}</span>
                            <div>
                              <div className="text-foreground font-medium">{item.employeeName}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                实际值: {actualValue} | 目标值: {targetValue !== null && targetValue !== undefined ? targetValue : '不考核'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">完成度</div>
                              <div className="text-lg font-bold text-accent">
                                {item.completionRate.toFixed(1)}%
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">得分</div>
                              <div className="text-lg font-bold text-accent">
                                {item.score.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>

            {/* 员工业务完成度排名 */}
            <Card className="p-6 mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">员工业务完成度排名</h3>
              <div className="mb-4">
                <label className="text-sm font-medium text-foreground mb-2 block">
                  选择员工
                </label>
                <select
                  value={selectedEmployeeForDetail || ''}
                  onChange={(e) => setSelectedEmployeeForDetail(e.target.value || null)}
                  className="w-full p-2 border border-border rounded bg-background text-foreground"
                >
                  <option value="">—— 请选择员工 ——</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedEmployeeForDetail && (() => {
                const selectedEmp = employees.find(e => e.id === selectedEmployeeForDetail);
                if (!selectedEmp) return null;

                const indicators = getAllIndicators();
                const indicatorRankings = indicators.map((indicator) => {
                  const actual = selectedEmp[indicator.key] !== null && selectedEmp[indicator.key] !== undefined ? parseFloat(String(selectedEmp[indicator.key])) : null;
                  const target = selectedEmp.targets?.[indicator.key];
                  const weight = selectedEmp.weights?.[indicator.key] || 0;
                  const completion = actual !== null && target !== null && target !== 0 ? (actual / target) * 100 : 0;
                  const score = actual !== null && target !== null && target !== 0
                    ? Math.max(0, Math.min((actual / target) * weight, weight))
                    : actual !== null ? Math.max(0, Math.min(actual, weight)) : 0;

                  // 计算该指标在所有员工中的排名
                  const allRankings = employees
                    .map((emp) => {
                      const empActual = emp[indicator.key] !== null && emp[indicator.key] !== undefined ? parseFloat(String(emp[indicator.key])) : null;
                      const empTarget = emp.targets?.[indicator.key];
                      const empCompletion = empActual !== null && empTarget !== null && empTarget !== 0 ? (empActual / empTarget) * 100 : 0;
                      return { emp, completion: empCompletion };
                    })
                    .sort((a, b) => b.completion - a.completion);

                  const rank = allRankings.findIndex(r => r.emp.id === selectedEmp.id) + 1;

                  return {
                    indicator,
                    actual,
                    target,
                    weight,
                    completion,
                    score,
                    rank,
                    totalEmployees: employees.length,
                  };
                });

                // 按完成度排序
                const sortedRankings = indicatorRankings.sort((a, b) => b.completion - a.completion);

                return (
                  <div>
                    <h4 className="font-semibold text-foreground mb-4">
                      {selectedEmp.name} - 各项业务完成度排名
                    </h4>
                    <div className="space-y-3">
                      {sortedRankings.map((item, index) => (
                        <div
                          key={item.indicator.key}
                          className="flex items-center justify-between p-4 bg-secondary rounded border border-border"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <span className="font-bold text-accent text-lg w-8">{index + 1}</span>
                            <div>
                              <div className="text-foreground font-medium">
                                {item.indicator.name} ({item.indicator.unit})
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                实际值: {item.actual} | 目标值: {item.target !== null && item.target !== undefined ? item.target : '不考核'} | 全员排名: {item.rank}/{item.totalEmployees}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">完成度</div>
                              <div className="text-lg font-bold text-accent">
                                {item.completion.toFixed(1)}%
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">得分</div>
                              <div className="text-lg font-bold text-accent">
                                {item.score.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </Card>

            {/* PDF 导出内容 */}
            <div ref={pdfRef} className="bg-white p-8 hidden" style={{ color: '#000', fontSize: '12px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px', textAlign: 'center' }}>
                KPI 成绩统计报告
              </h1>
              <p style={{ marginBottom: '20px', color: '#666', textAlign: 'center' }}>
                生成时间: {new Date().toLocaleString()}
              </p>

              {/* 1. 员工总排名 */}
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px', marginTop: '20px', pageBreakBefore: 'auto' }}>
                1. 员工总排名
              </h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '11px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #000' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>排名</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>员工名称</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>得分</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>满分</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>完成度</th>
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
                      const percentage = emp.maxScore > 0 ? (emp.score / emp.maxScore) * 100 : 0;
                      return (
                        <tr key={emp.id} style={{ borderBottom: '1px solid #ddd' }}>
                          <td style={{ padding: '8px' }}>{index + 1}</td>
                          <td style={{ padding: '8px' }}>{emp.name}</td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>{emp.score.toFixed(2)}</td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>{emp.maxScore.toFixed(2)}</td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>{percentage.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>

              {/* 2. 每位员工的详细数据 */}
              {employees.map((emp) => (
                <div key={emp.id} style={{ marginBottom: '30px', pageBreakInside: 'avoid' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', marginTop: '20px' }}>
                    2. {emp.name} - 详细成绩
                  </h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #000' }}>
                        <th style={{ padding: '8px', textAlign: 'left' }}>指标名称</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>实际值</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>目标值</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>权重</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>得分</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>完成度</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getAllIndicators().map((indicator) => {
                        const actual = emp[indicator.key] !== null && emp[indicator.key] !== undefined ? parseFloat(String(emp[indicator.key])) : null;
                        const target = emp.targets?.[indicator.key];
                        const weight = emp.weights?.[indicator.key] || 0;
                        const score = actual !== null && target !== null && target !== 0
                          ? Math.max(0, Math.min((actual / target) * weight, weight))
                          : actual !== null ? Math.max(0, Math.min(actual, weight)) : 0;
                        const completionNum = actual !== null && target !== null && target !== 0
                          ? (actual / target) * 100
                          : null;
                        const completion = completionNum !== null ? completionNum.toFixed(1) : '—';
                        
                        // 计算进度条宽度
                        const progressWidth = completionNum !== null ? Math.max(0, Math.min(completionNum, 100)) : 0;

                        return (
                          <tr key={indicator.key} style={{ borderBottom: '1px solid #ddd' }}>
                            <td style={{ padding: '8px' }}>{indicator.name}</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>{actual !== null ? `${actual}${indicator.unit}` : '—'}</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>{target !== null && target !== undefined ? `${target}${indicator.unit}` : '—'}</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>{weight.toFixed(2)}%</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>{score.toFixed(2)}</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                                <div className="visual-only" style={{ width: '60px', height: '8px', backgroundColor: '#eee', borderRadius: '4px', overflow: 'hidden', display: 'inline-block' }}>
                                  <div style={{ width: `${progressWidth}%`, height: '100%', backgroundColor: '#1e40af' }}></div>
                                </div>
                                <span>{completion}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>总分: {getEmployeeTotalScore(emp.id).toFixed(2)} / {getEmployeeTotalMaxScore(emp.id).toFixed(2)}</strong>
                  </div>
                </div>
              ))}

              {/* 3. 每项指标的排名 */}
              {getAllIndicators().map((indicator) => (
                <div key={indicator.key} style={{ marginBottom: '30px', pageBreakInside: 'avoid' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', marginTop: '20px' }}>
                    3. {indicator.name} ({indicator.unit}) - 排名
                  </h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #000' }}>
                        <th style={{ padding: '8px', textAlign: 'left' }}>排名</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>员工名称</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>实际值</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>目标值</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>完成度</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>得分</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees
                        .map((emp) => {
                          const actual = emp[indicator.key] !== null && emp[indicator.key] !== undefined ? parseFloat(String(emp[indicator.key])) : null;
                          const target = emp.targets?.[indicator.key];
                          const weight = emp.weights?.[indicator.key] || 0;
                          const score = actual !== null && target !== null && target !== 0
                            ? Math.max(0, Math.min((actual / target) * weight, weight))
                            : actual !== null ? Math.max(0, Math.min(actual, weight)) : 0;
                          const completion = actual !== null && target !== null && target !== 0
                            ? ((actual / target) * 100)
                            : 0;
                          return { emp, actual, target, weight, score, completion };
                        })
                        .sort((a, b) => b.completion - a.completion)
                        .map((item, index) => (
                          <tr key={item.emp.id} style={{ borderBottom: '1px solid #ddd' }}>
                            <td style={{ padding: '8px' }}>{index + 1}</td>
                            <td style={{ padding: '8px' }}>{item.emp.name}</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>{item.actual !== null ? `${item.actual}${indicator.unit}` : '—'}</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>{item.target !== null && item.target !== undefined ? `${item.target}${indicator.unit}` : '—'}</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>{item.completion.toFixed(1)}%</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>{item.score.toFixed(2)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ))}

              {/* 4. 员工各项业务完成度排名 */}
              {employees.map((emp) => {
                const indicators = getAllIndicators();
                const indicatorRankings = indicators.map((indicator) => {
                  const actual = emp[indicator.key] !== null && emp[indicator.key] !== undefined ? parseFloat(String(emp[indicator.key])) : null;
                  const target = emp.targets?.[indicator.key];
                  const weight = emp.weights?.[indicator.key] || 0;
                  const completion = actual !== null && target !== null && target !== 0 ? (actual / target) * 100 : 0;
                  const score = actual !== null && target !== null && target !== 0
                    ? Math.max(0, Math.min((actual / target) * weight, weight))
                    : actual !== null ? Math.max(0, Math.min(actual, weight)) : 0;

                  const allRankings = employees
                    .map((e) => {
                      const eActualValue = e[indicator.key];
                      const eActual = eActualValue !== undefined && eActualValue !== null ? Number(eActualValue) : 0;
                      const eTarget = e.targets?.[indicator.key];
                      const eCompletion = eTarget !== null && eTarget !== 0 ? (eActual / eTarget) * 100 : 0;
                      return { emp: e, completion: eCompletion };
                    })
                    .sort((a, b) => b.completion - a.completion);

                  const rank = allRankings.findIndex(r => r.emp.id === emp.id) + 1;

                  return {
                    indicator,
                    actual,
                    target,
                    weight,
                    completion,
                    score,
                    rank,
                    totalEmployees: employees.length,
                  };
                });

                const sortedRankings = indicatorRankings.sort((a, b) => b.completion - a.completion);

                return (
                  <div key={emp.id} style={{ marginBottom: '30px', pageBreakInside: 'avoid' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', marginTop: '20px' }}>
                      4. {emp.name} - 各项业务完成度排名
                    </h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px', fontSize: '11px' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #000' }}>
                          <th style={{ padding: '8px', textAlign: 'left' }}>排名</th>
                          <th style={{ padding: '8px', textAlign: 'left' }}>业务项目</th>
                          <th style={{ padding: '8px', textAlign: 'right' }}>实际值</th>
                          <th style={{ padding: '8px', textAlign: 'right' }}>目标值</th>
                          <th style={{ padding: '8px', textAlign: 'right' }}>完成度</th>
                          <th style={{ padding: '8px', textAlign: 'right' }}>得分</th>
                          <th style={{ padding: '8px', textAlign: 'right' }}>全员排名</th>
                        </tr>
	                      </thead>
	                      <tbody>
	                           {sortedRankings.map((item, index) => (                     <tr key={item.indicator.key} style={{ borderBottom: '1px solid #ddd' }}>
                            <td style={{ padding: '8px' }}>{index + 1}</td>
                            <td style={{ padding: '8px' }}>{item.indicator.name}</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>{item.actual !== null ? `${item.actual}${item.indicator.unit}` : '—'}</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>{item.target !== null && item.target !== undefined ? `${item.target}${item.indicator.unit}` : '—'}</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>{item.completion.toFixed(1)}%</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>{item.score.toFixed(2)}</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>{item.rank}/{item.totalEmployees}</td>
                          </tr>
                        ))}    </tbody>
                    </table>
                  </div>
                );
              })}
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
