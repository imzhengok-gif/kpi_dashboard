import { useEffect, useState } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface KPIData {
  [key: string]: {
    [key: string]: number | string;
  };
}

export default function Home() {
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/kpi_summary.json');
        const data = await response.json();
        setKpiData(data);
      } catch (error) {
        console.error('Failed to load KPI data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 准备财富管理数据用于图表
  const wealthManagementData = kpiData?.['财富管理'] ? 
    Object.entries(kpiData['财富管理']).map(([key, value]) => ({
      name: key,
      value: typeof value === 'number' ? value : 0,
    })) : [];

  // 权重分布数据
  const weightsData = [
    { name: '有效户', value: 0.055 },
    { name: '裂变客户', value: 0.015 },
    { name: '机构业务收入', value: 0.05 },
    { name: '算法开通', value: 0.02 },
    { name: '新开户净新增资产', value: 0.03 },
    { name: '存量净新增资产', value: 0.03 },
    { name: '产品收入', value: 0.07 },
    { name: '产品销量', value: 0.03 },
    { name: '两融收入', value: 0.07 },
    { name: '两融规模', value: 0.03 },
  ];

  const COLORS = ['#1e40af', '#0891b2', '#0284c7', '#1e3a8a', '#172554', '#ea580c', '#0c4a6e', '#0f766e', '#7c3aed', '#db2777'];

  // 关键指标卡片数据
  const keyMetrics = [
    {
      label: '目标新增有效户（线下）',
      value: 108,
      unit: '户',
      category: '客户市场',
    },
    {
      label: '目标裂变客户数',
      value: 143,
      unit: '户',
      category: '客户市场',
    },
    {
      label: '目标机构业务收入',
      value: 1,
      unit: '万元',
      category: '机构业务',
    },
    {
      label: '目标产品收入',
      value: 6,
      unit: '万元',
      category: '财富管理',
    },
    {
      label: '目标产品销量',
      value: 300,
      unit: '万元',
      category: '财富管理',
    },
    {
      label: '目标投顾业务净收入',
      value: 3.5,
      unit: '万元',
      category: '财富管理',
    },
    {
      label: '目标两融净利息收入',
      value: 2,
      unit: '万元',
      category: '资本中介',
    },
    {
      label: '目标两融日均规模',
      value: 270,
      unit: '万元',
      category: '资本中介',
    },
  ];

  if (loading) {
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
      <div 
        className="relative h-64 md:h-80 bg-cover bg-center flex items-center justify-center overflow-hidden"
        style={{
          backgroundImage: 'url(/images/hero-background.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="relative z-10 text-center text-white">
          <h1 className="text-4xl md:text-5xl font-bold mb-2">KPI 数据可视化仪表板</h1>
          <p className="text-lg md:text-xl text-gray-100">郑浩生关键绩效指标分析</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-12">
        {/* 关键指标卡片网格 */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-8 text-foreground">关键指标概览</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {keyMetrics.map((metric, index) => (
              <div key={index} className="kpi-card">
                <div className="kpi-label">{metric.label}</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="kpi-value">{metric.value}</span>
                  <span className="text-sm text-muted-foreground">{metric.unit}</span>
                </div>
                <div className="mt-3 text-xs font-medium text-accent">{metric.category}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 数据可视化标签页 */}
        <section className="mb-12">
          <Tabs defaultValue="wealth" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="wealth">财富管理指标</TabsTrigger>
              <TabsTrigger value="weights">权重分布</TabsTrigger>
              <TabsTrigger value="trend">趋势分析</TabsTrigger>
            </TabsList>

            {/* 财富管理指标图表 */}
            <TabsContent value="wealth" className="chart-container">
              <h3 className="text-xl font-bold mb-6 text-foreground">财富管理关键 KPI 目标</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={wealthManagementData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#bfdbfe" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100}
                    tick={{ fill: '#0c2340', fontSize: 12 }}
                  />
                  <YAxis tick={{ fill: '#0c2340' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #bfdbfe' }}
                    labelStyle={{ color: '#0c2340' }}
                  />
                  <Bar dataKey="value" fill="#1e40af" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>

            {/* 权重分布图表 */}
            <TabsContent value="weights" className="chart-container">
              <h3 className="text-xl font-bold mb-6 text-foreground">KPI 权重分布</h3>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={weightsData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${(value * 100).toFixed(1)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {weightsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => `${(value * 100).toFixed(1)}%`}
                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #bfdbfe' }}
                    labelStyle={{ color: '#0c2340' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </TabsContent>

            {/* 趋势分析 */}
            <TabsContent value="trend" className="chart-container">
              <h3 className="text-xl font-bold mb-6 text-foreground">业务线收入趋势预测</h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={[
                  { month: '1月', 机构业务: 1, 财富管理: 6, 资本中介: 2 },
                  { month: '2月', 机构业务: 1.2, 财富管理: 6.5, 资本中介: 2.1 },
                  { month: '3月', 机构业务: 1.5, 财富管理: 7, 资本中介: 2.3 },
                  { month: '4月', 机构业务: 1.8, 财富管理: 7.5, 资本中介: 2.5 },
                  { month: '5月', 机构业务: 2, 财富管理: 8, 资本中介: 2.7 },
                  { month: '6月', 机构业务: 2.2, 财富管理: 8.5, 资本中介: 2.9 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#bfdbfe" />
                  <XAxis dataKey="month" tick={{ fill: '#0c2340' }} />
                  <YAxis tick={{ fill: '#0c2340' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #bfdbfe' }}
                    labelStyle={{ color: '#0c2340' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="机构业务" stroke="#1e40af" strokeWidth={2} dot={{ fill: '#1e40af' }} />
                  <Line type="monotone" dataKey="财富管理" stroke="#0891b2" strokeWidth={2} dot={{ fill: '#0891b2' }} />
                  <Line type="monotone" dataKey="资本中介" stroke="#ea580c" strokeWidth={2} dot={{ fill: '#ea580c' }} />
                </LineChart>
              </ResponsiveContainer>
            </TabsContent>
          </Tabs>
        </section>

        {/* 业务线分类卡片 */}
        <section>
          <h2 className="text-3xl font-bold mb-8 text-foreground">业务线详情</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 客户市场 */}
            <Card className="p-6 bg-card text-card-foreground border-l-4 border-l-primary">
              <h3 className="text-xl font-bold mb-4 text-foreground">客户市场</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">新增有效户</p>
                  <p className="text-2xl font-bold text-primary">108户</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">裂变客户数</p>
                  <p className="text-2xl font-bold text-primary">143户</p>
                </div>
              </div>
            </Card>

            {/* 机构业务 */}
            <Card className="p-6 bg-card text-card-foreground border-l-4 border-l-accent">
              <h3 className="text-xl font-bold mb-4 text-foreground">机构业务</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">业务收入</p>
                  <p className="text-2xl font-bold text-accent">1万元</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">算法开通数</p>
                  <p className="text-2xl font-bold text-accent">4户</p>
                </div>
              </div>
            </Card>

            {/* 资本中介 */}
            <Card className="p-6 bg-card text-card-foreground border-l-4 border-l-chart-1">
              <h3 className="text-xl font-bold mb-4 text-foreground">资本中介</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">两融净利息收入</p>
                  <p className="text-2xl font-bold text-chart-1">2万元</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">两融日均规模</p>
                  <p className="text-2xl font-bold text-chart-1">270万元</p>
                </div>
              </div>
            </Card>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-secondary text-secondary-foreground py-8 mt-16">
        <div className="container text-center">
          <p className="text-sm">© 2024 KPI 数据可视化仪表板 | 郑浩生关键绩效指标管理系统</p>
        </div>
      </footer>
    </div>
  );
}
