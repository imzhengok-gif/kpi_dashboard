# 代码修改详细说明

## 1. 导出功能修改 (saveData函数)

### 修改前
- 导出为CSV格式
- 只包含实际值、目标值、权重%、得分

### 修改后
- 导出为Excel格式(.xlsx)
- 表头包含：员工名称 + 各指标(实际、目标、权重%、得分) + 总分
- 使用XLSX库的aoa_to_sheet方法生成Excel

### 关键代码
```typescript
const saveData = () => {
  if (!kpiStructure) return;

  const ws_data: any[] = [];
  
  // 表头：员工名称 + 各指标(实际值、目标值、权重%、得分)
  const headers = ['员工名称'];
  Object.entries(kpiStructure).forEach(([category, categoryData]) => {
    categoryData.指标.forEach((indicator) => {
      headers.push(`${category}_${indicator.name}(实际)`);
      headers.push(`${category}_${indicator.name}(目标)`);
      headers.push(`${category}_${indicator.name}(权重%)`);
      headers.push(`${category}_${indicator.name}(得分)`);
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
        const actual = kpi[key]?.actual || 0;
        const target = kpi[key]?.target ?? '';
        const weight = emp.weights[key] ?? 0;
        const score = kpi[key]?.score || 0;
        row.push(actual);
        row.push(target);
        row.push(weight);
        row.push(score);
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
```

## 2. 导入功能修改 (handleImportFile函数)

### 修改前
- 导入时追加更新现有数据
- 只更新已存在的员工

### 修改后
- 导入时完全替换现有员工列表
- 从Excel中读取所有员工信息
- 如果员工不存在则创建新员工
- 如果员工存在则重置后重新填充

### 关键代码
```typescript
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
            
            // 导入实际值
            const actualHeaderIndex = headers.indexOf(`${category}_${indicator.name}(实际)`);
            if (actualHeaderIndex !== -1 && row[actualHeaderIndex]) {
              const value = row[actualHeaderIndex];
              if (value !== '(不考核)' && value !== '') {
                employee[key] = parseFloat(value) || null;
              }
            }
            
            // 导入目标值
            const targetHeaderIndex = headers.indexOf(`${category}_${indicator.name}(目标)`);
            if (targetHeaderIndex !== -1 && row[targetHeaderIndex]) {
              const value = row[targetHeaderIndex];
              if (value !== '' && value !== undefined) {
                employee.targets[key] = parseFloat(value) || null;
              }
            }
            
            // 导入权重
            const weightHeaderIndex = headers.indexOf(`${category}_${indicator.name}(权重%)`);
            if (weightHeaderIndex !== -1 && row[weightHeaderIndex]) {
              const value = row[weightHeaderIndex];
              if (value !== '' && value !== undefined) {
                employee.weights[key] = parseFloat(value) || 0;
              }
            }
            
            // 设置启用状态
            employee.enabledIndicators![key] = true;
          });
        });
        
        newEmployees.push(employee);
      }
      
      // 完全替换员工列表
      if (newEmployees.length > 0) {
        setEmployees(newEmployees);
        alert(`✅ 数据导入成功！已导入 ${newEmployees.length} 名员工的数据`);
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
```

## 3. 删除的函数

### exportTemplate函数
- 完全删除了导出模板功能
- 移除了UI中的"导出模板"按钮

## 4. 删除的函数

### exportToExcel函数
- 删除了导出CSV的函数
- 移除了结果统计页面中的"导出为CSV"按钮

## 5. UI修改

### 按钮变化
```
修改前：
- 添加员工
- 导出模板 ← 删除
- 导出Excel
- 保存数据
- 导入数据

修改后：
- 添加员工
- 导出Excel
- 保存数据
- 导入数据
```

## 6. 服务器修改 (server/index.ts)

### 修复的Bug
```typescript
// 修改前
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}/`);
});

// 修改后
const port = process.env.PORT || 3000;
const server = createServer(app);

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}/`);
});
```

## 7. 导入修改

### 添加的导入
```typescript
import { Download, Plus, Trash2, Edit2, Settings, Copy, Check, X, Upload, List, Save } from 'lucide-react';
// 添加了 Save 图标
```

## 文件修改统计

| 文件 | 修改类型 | 修改行数 |
|------|---------|---------|
| client/src/pages/Home.tsx | 修改 | ~150 |
| server/index.ts | 修改 | 2 |
| CHANGES.md | 新增 | 200+ |
| USAGE_GUIDE.md | 新增 | 300+ |

## 向后兼容性

- 新的导入格式与旧的导出格式兼容
- 旧的导出模板格式不再支持
- 建议用户使用新的导出格式进行数据交换

## 测试覆盖

- ✅ TypeScript编译检查通过
- ✅ 项目构建成功
- ✅ 导出功能可生成有效的Excel文件
- ✅ 导入功能可正确解析Excel文件
- ✅ 数据保存到本地文件
- ✅ 数据加载从本地文件
