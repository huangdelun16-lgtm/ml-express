// 这是骑手收支记录Tab的完整UI代码
// 将替换src/pages/FinanceManagement.tsx中的 {activeTab === 'courier_records' && (...)} 部分

{activeTab === 'courier_records' && (
  <div>
    {/* 顶部操作栏 */}
    <div style={{
      background: 'rgba(255, 255, 255, 0.12)',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '24px',
      border: '1px solid rgba(255, 255, 255, 0.18)',
      display: 'flex',
      gap: '16px',
      flexWrap: 'wrap',
      alignItems: 'center'
    }}>
      <h3 style={{ margin: 0, color: 'white', flex: '1 1 auto' }}>💰 骑手工资结算管理</h3>
      
      {/* 状态筛选 */}
      <select
        value={salaryFilterStatus}
        onChange={(e) => setSalaryFilterStatus(e.target.value as any)}
        style={{
          padding: '10px 16px',
          borderRadius: '10px',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          background: 'rgba(7, 23, 53, 0.65)',
          color: 'white',
          fontSize: '0.9rem'
        }}
      >
        <option value="all">全部状态</option>
        <option value="pending">待结算</option>
        <option value="approved">已审核</option>
        <option value="paid">已发放</option>
        <option value="rejected">已拒绝</option>
      </select>
      
      {/* 操作按钮 */}
      <button
        onClick={async () => {
          // 生成当月工资
          if (!confirm('是否为所有骑手生成本月工资记录？')) return;
          
          setLoading(true);
          try {
            // 获取所有已送达包裹
            const allPackages = await packageService.getAllPackages();
            const deliveredPackages = allPackages.filter(pkg => pkg.status === '已送达' && pkg.courier && pkg.courier !== '待分配');
            
            // 按骑手分组
            const courierGroups: Record<string, Package[]> = {};
            deliveredPackages.forEach(pkg => {
              const courierId = pkg.courier;
              if (!courierGroups[courierId]) {
                courierGroups[courierId] = [];
              }
              courierGroups[courierId].push(pkg);
            });
            
            // 结算周期
            const now = new Date();
            const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
            
            // 为每个骑手生成工资记录
            let successCount = 0;
            for (const [courierId, packages] of Object.entries(courierGroups)) {
              // 计算统计数据
              const totalDeliveries = packages.length;
              const totalKm = packages.reduce((sum, pkg) => sum + (pkg.delivery_distance || 0), 0);
              
              // 计算各项费用
              const COURIER_KM_RATE = 500; // MMK/KM
              const DELIVERY_BONUS_RATE = 1000; // MMK/单
              const BASE_SALARY = 200000; // 基本工资 MMK
              
              const kmFee = totalKm * COURIER_KM_RATE;
              const deliveryBonus = totalDeliveries * DELIVERY_BONUS_RATE;
              const baseSalary = BASE_SALARY;
              
              const grossSalary = baseSalary + kmFee + deliveryBonus;
              const netSalary = grossSalary; // 暂无扣款
              
              const salary: Omit<CourierSalary, 'id'> = {
                courier_id: courierId,
                courier_name: courierId, // TODO: 从courier表获取真实姓名
                settlement_period: 'monthly',
                period_start_date: periodStart,
                period_end_date: periodEnd,
                base_salary: baseSalary,
                km_fee: kmFee,
                delivery_bonus: deliveryBonus,
                performance_bonus: 0,
                overtime_pay: 0,
                tip_amount: 0,
                deduction_amount: 0,
                total_deliveries: totalDeliveries,
                total_km: totalKm,
                on_time_deliveries: totalDeliveries, // TODO: 实际统计
                late_deliveries: 0,
                gross_salary: grossSalary,
                net_salary: netSalary,
                status: 'pending'
              };
              
              const success = await courierSalaryService.createSalary(salary);
              if (success) successCount++;
            }
            
            alert(`成功生成 ${successCount} 条工资记录！`);
            await loadRecords();
          } catch (error) {
            console.error('生成工资失败:', error);
            alert('生成工资失败，请重试！');
          } finally {
            setLoading(false);
          }
        }}
        style={{
          padding: '10px 20px',
          borderRadius: '10px',
          border: 'none',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          cursor: 'pointer',
          fontSize: '0.9rem',
          fontWeight: '600',
          transition: 'all 0.3s ease'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.4)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        🔄 生成本月工资
      </button>
      
      {selectedSalaries.length > 0 && (
        <>
          <button
            onClick={async () => {
              if (!confirm(`是否批量审核 ${selectedSalaries.length} 条工资记录？`)) return;
              
              setLoading(true);
              try {
                const success = await courierSalaryService.batchApproveSalaries(
                  selectedSalaries,
                  localStorage.getItem('admin_name') || 'System'
                );
                
                if (success) {
                  alert('批量审核成功！');
                  await loadRecords();
                  setSelectedSalaries([]);
                } else {
                  alert('批量审核失败！');
                }
              } catch (error) {
                console.error('批量审核失败:', error);
                alert('批量审核失败！');
              } finally {
                setLoading(false);
              }
            }}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
              color: 'white',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '600'
            }}
          >
            ✅ 批量审核 ({selectedSalaries.length})
          </button>
          
          <button
            onClick={() => {
              setShowPaymentModal(true);
            }}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '600'
            }}
          >
            💳 批量发放 ({selectedSalaries.length})
          </button>
        </>
      )}
    </div>

    {/* 工资统计卡片 */}
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '16px',
      marginBottom: '24px'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.2) 100%)',
        border: '1px solid rgba(251, 191, 36, 0.3)',
        borderRadius: '16px',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{ color: '#fbbf24', fontSize: '2rem', fontWeight: 'bold', marginBottom: '8px' }}>
          {courierSalaries.filter(s => s.status === 'pending').length}
        </div>
        <div style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.95rem' }}>待结算</div>
      </div>
      
      <div style={{
        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(22, 163, 74, 0.2) 100%)',
        border: '1px solid rgba(34, 197, 94, 0.3)',
        borderRadius: '16px',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{ color: '#22c55e', fontSize: '2rem', fontWeight: 'bold', marginBottom: '8px' }}>
          {courierSalaries.filter(s => s.status === 'approved').length}
        </div>
        <div style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.95rem' }}>已审核</div>
      </div>
      
      <div style={{
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.2) 100%)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '16px',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{ color: '#3b82f6', fontSize: '2rem', fontWeight: 'bold', marginBottom: '8px' }}>
          {courierSalaries.filter(s => s.status === 'paid').length}
        </div>
        <div style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.95rem' }}>已发放</div>
      </div>
      
      <div style={{
        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(147, 51, 234, 0.2) 100%)',
        border: '1px solid rgba(168, 85, 247, 0.3)',
        borderRadius: '16px',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{ color: '#a855f7', fontSize: '1.6rem', fontWeight: 'bold', marginBottom: '8px' }}>
          {courierSalaries.reduce((sum, s) => sum + s.net_salary, 0).toLocaleString()} MMK
        </div>
        <div style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.95rem' }}>工资总额</div>
      </div>
    </div>

    {/* 工资记录表格 */}
    <div style={{
      background: 'rgba(255, 255, 255, 0.12)',
      borderRadius: '16px',
      padding: '24px',
      border: '1px solid rgba(255, 255, 255, 0.18)',
      overflow: 'auto'
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1200px' }}>
        <thead>
          <tr style={{ background: 'rgba(255, 255, 255, 0.1)', borderBottom: '2px solid rgba(255, 255, 255, 0.2)' }}>
            <th style={{ padding: '14px 12px', textAlign: 'left', color: 'white', fontSize: '0.9rem', fontWeight: '600' }}>
              <input
                type="checkbox"
                checked={selectedSalaries.length === courierSalaries.filter(s => salaryFilterStatus === 'all' || s.status === salaryFilterStatus).length && courierSalaries.length > 0}
                onChange={(e) => {
                  const filtered = courierSalaries.filter(s => salaryFilterStatus === 'all' || s.status === salaryFilterStatus);
                  if (e.target.checked) {
                    setSelectedSalaries(filtered.map(s => s.id!));
                  } else {
                    setSelectedSalaries([]);
                  }
                }}
                style={{ cursor: 'pointer' }}
              />
            </th>
            <th style={{ padding: '14px 12px', textAlign: 'left', color: 'white', fontSize: '0.9rem', fontWeight: '600' }}>骑手ID</th>
            <th style={{ padding: '14px 12px', textAlign: 'left', color: 'white', fontSize: '0.9rem', fontWeight: '600' }}>结算周期</th>
            <th style={{ padding: '14px 12px', textAlign: 'right', color: 'white', fontSize: '0.9rem', fontWeight: '600' }}>基本工资</th>
            <th style={{ padding: '14px 12px', textAlign: 'right', color: 'white', fontSize: '0.9rem', fontWeight: '600' }}>公里费</th>
            <th style={{ padding: '14px 12px', textAlign: 'right', color: 'white', fontSize: '0.9rem', fontWeight: '600' }}>配送奖金</th>
            <th style={{ padding: '14px 12px', textAlign: 'right', color: 'white', fontSize: '0.9rem', fontWeight: '600' }}>应发工资</th>
            <th style={{ padding: '14px 12px', textAlign: 'right', color: 'white', fontSize: '0.9rem', fontWeight: '600' }}>实发工资</th>
            <th style={{ padding: '14px 12px', textAlign: 'center', color: 'white', fontSize: '0.9rem', fontWeight: '600' }}>配送单数</th>
            <th style={{ padding: '14px 12px', textAlign: 'center', color: 'white', fontSize: '0.9rem', fontWeight: '600' }}>状态</th>
            <th style={{ padding: '14px 12px', textAlign: 'center', color: 'white', fontSize: '0.9rem', fontWeight: '600' }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {(() => {
            const filtered = courierSalaries.filter(s => salaryFilterStatus === 'all' || s.status === salaryFilterStatus);
            
            if (filtered.length === 0) {
              return (
                <tr>
                  <td colSpan={11} style={{ padding: '40px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)', fontSize: '1rem' }}>
                    暂无工资记录
                  </td>
                </tr>
              );
            }
            
            return filtered.map((salary) => (
              <tr key={salary.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', transition: 'all 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '14px 12px', color: 'white' }}>
                  <input
                    type="checkbox"
                    checked={selectedSalaries.includes(salary.id!)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedSalaries([...selectedSalaries, salary.id!]);
                      } else {
                        setSelectedSalaries(selectedSalaries.filter(id => id !== salary.id));
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                </td>
                <td style={{ padding: '14px 12px', color: 'white', fontSize: '0.9rem', fontWeight: '600' }}>
                  {salary.courier_id}
                </td>
                <td style={{ padding: '14px 12px', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.85rem' }}>
                  {salary.period_start_date} ~ {salary.period_end_date}
                </td>
                <td style={{ padding: '14px 12px', textAlign: 'right', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
                  {salary.base_salary.toLocaleString()}
                </td>
                <td style={{ padding: '14px 12px', textAlign: 'right', color: '#74b9ff', fontSize: '0.9rem', fontWeight: '600' }}>
                  {salary.km_fee.toLocaleString()}
                </td>
                <td style={{ padding: '14px 12px', textAlign: 'right', color: '#a29bfe', fontSize: '0.9rem', fontWeight: '600' }}>
                  {salary.delivery_bonus.toLocaleString()}
                </td>
                <td style={{ padding: '14px 12px', textAlign: 'right', color: '#fdcb6e', fontSize: '0.9rem', fontWeight: 'bold' }}>
                  {salary.gross_salary.toLocaleString()}
                </td>
                <td style={{ padding: '14px 12px', textAlign: 'right', color: '#55efc4', fontSize: '1rem', fontWeight: 'bold' }}>
                  {salary.net_salary.toLocaleString()} MMK
                </td>
                <td style={{ padding: '14px 12px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
                  {salary.total_deliveries} 单
                </td>
                <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                  <span style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    background: 
                      salary.status === 'pending' ? 'rgba(251, 191, 36, 0.2)' :
                      salary.status === 'approved' ? 'rgba(34, 197, 94, 0.2)' :
                      salary.status === 'paid' ? 'rgba(59, 130, 246, 0.2)' :
                      'rgba(239, 68, 68, 0.2)',
                    color: 
                      salary.status === 'pending' ? '#fbbf24' :
                      salary.status === 'approved' ? '#22c55e' :
                      salary.status === 'paid' ? '#3b82f6' :
                      '#ef4444'
                  }}>
                    {salary.status === 'pending' ? '待结算' :
                     salary.status === 'approved' ? '已审核' :
                     salary.status === 'paid' ? '已发放' :
                     '已拒绝'}
                  </span>
                </td>
                <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button
                      onClick={async () => {
                        setSelectedSalary(salary);
                        const details = await courierSalaryService.getSalaryDetails(salary.id!);
                        setSalaryDetails(details);
                        setShowSalaryDetail(true);
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        background: 'rgba(59, 130, 246, 0.2)',
                        color: '#3b82f6',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '600'
                      }}
                    >
                      详情
                    </button>
                    
                    {salary.status === 'pending' && (
                      <button
                        onClick={async () => {
                          if (!confirm('确认审核通过？')) return;
                          
                          setLoading(true);
                          try {
                            const success = await courierSalaryService.updateSalary(salary.id!, {
                              status: 'approved',
                              approved_by: localStorage.getItem('admin_name') || 'System',
                              approved_at: new Date().toISOString()
                            });
                            
                            if (success) {
                              alert('审核成功！');
                              await loadRecords();
                            } else {
                              alert('审核失败！');
                            }
                          } catch (error) {
                            console.error('审核失败:', error);
                            alert('审核失败！');
                          } finally {
                            setLoading(false);
                          }
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          background: 'rgba(34, 197, 94, 0.2)',
                          color: '#22c55e',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: '600'
                        }}
                      >
                        审核
                      </button>
                    )}
                    
                    {salary.status === 'approved' && (
                      <button
                        onClick={async () => {
                          setSelectedSalaries([salary.id!]);
                          setShowPaymentModal(true);
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          background: 'rgba(245, 87, 108, 0.2)',
                          color: '#f5576c',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: '600'
                        }}
                      >
                        发放
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ));
          })()}
        </tbody>
      </table>
    </div>

    {/* 工资详情模态框 */}
    {showSalaryDetail && selectedSalary && (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}
        onClick={() => setShowSalaryDetail(false)}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
            borderRadius: '20px',
            padding: '32px',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ margin: 0, color: 'white', fontSize: '1.5rem' }}>💰 工资详情</h2>
            <button
              onClick={() => setShowSalaryDetail(false)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              关闭
            </button>
          </div>

          {/* 基本信息 */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: 'white', fontSize: '1.1rem' }}>基本信息</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <div>
                <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.85rem', marginBottom: '4px' }}>骑手ID</div>
                <div style={{ color: 'white', fontSize: '1rem', fontWeight: '600' }}>{selectedSalary.courier_id}</div>
              </div>
              <div>
                <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.85rem', marginBottom: '4px' }}>结算周期</div>
                <div style={{ color: 'white', fontSize: '0.9rem' }}>
                  {selectedSalary.period_start_date} ~ {selectedSalary.period_end_date}
                </div>
              </div>
              <div>
                <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.85rem', marginBottom: '4px' }}>配送单数</div>
                <div style={{ color: '#74b9ff', fontSize: '1rem', fontWeight: '600' }}>{selectedSalary.total_deliveries} 单</div>
              </div>
              <div>
                <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.85rem', marginBottom: '4px' }}>配送距离</div>
                <div style={{ color: '#fd79a8', fontSize: '1rem', fontWeight: '600' }}>{selectedSalary.total_km.toFixed(2)} KM</div>
              </div>
            </div>
          </div>

          {/* 工资组成 */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: 'white', fontSize: '1.1rem' }}>工资组成</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>基本工资</span>
                <span style={{ color: 'white', fontWeight: '600' }}>{selectedSalary.base_salary.toLocaleString()} MMK</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>公里费</span>
                <span style={{ color: '#74b9ff', fontWeight: '600' }}>+{selectedSalary.km_fee.toLocaleString()} MMK</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>配送奖金</span>
                <span style={{ color: '#a29bfe', fontWeight: '600' }}>+{selectedSalary.delivery_bonus.toLocaleString()} MMK</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>绩效奖金</span>
                <span style={{ color: '#55efc4', fontWeight: '600' }}>+{selectedSalary.performance_bonus.toLocaleString()} MMK</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>加班费</span>
                <span style={{ color: '#ffeaa7', fontWeight: '600' }}>+{selectedSalary.overtime_pay.toLocaleString()} MMK</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>小费</span>
                <span style={{ color: '#fd79a8', fontWeight: '600' }}>+{selectedSalary.tip_amount.toLocaleString()} MMK</span>
              </div>
              {selectedSalary.deduction_amount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>扣款</span>
                  <span style={{ color: '#ff7675', fontWeight: '600' }}>-{selectedSalary.deduction_amount.toLocaleString()} MMK</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', marginTop: '8px', borderTop: '2px solid rgba(255, 255, 255, 0.3)' }}>
                <span style={{ color: 'white', fontSize: '1.1rem', fontWeight: '600' }}>实发工资</span>
                <span style={{ color: '#55efc4', fontSize: '1.3rem', fontWeight: 'bold' }}>{selectedSalary.net_salary.toLocaleString()} MMK</span>
              </div>
            </div>
          </div>

          {/* 备注 */}
          {selectedSalary.notes && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '16px'
            }}>
              <h4 style={{ margin: '0 0 8px 0', color: 'white', fontSize: '0.95rem' }}>备注</h4>
              <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                {selectedSalary.notes}
              </div>
            </div>
          )}
        </div>
      </div>
    )}

    {/* 发放工资模态框 */}
    {showPaymentModal && (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}
        onClick={() => setShowPaymentModal(false)}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
            borderRadius: '20px',
            padding: '32px',
            maxWidth: '500px',
            width: '100%',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 style={{ margin: '0 0 24px 0', color: 'white', fontSize: '1.5rem' }}>💳 发放工资</h2>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.95rem' }}>
              发放方式 *
            </label>
            <select
              value={paymentForm.payment_method}
              onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                background: 'rgba(7, 23, 53, 0.65)',
                color: 'white',
                fontSize: '0.95rem'
              }}
            >
              <option value="cash">现金</option>
              <option value="bank_transfer">银行转账</option>
              <option value="kbz_pay">KBZ Pay</option>
              <option value="wave_money">Wave Money</option>
              <option value="mobile_money">其他移动支付</option>
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.95rem' }}>
              支付凭证号
            </label>
            <input
              type="text"
              value={paymentForm.payment_reference}
              onChange={(e) => setPaymentForm({ ...paymentForm, payment_reference: e.target.value })}
              placeholder="银行单号/交易号"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                background: 'rgba(255, 255, 255, 0.18)',
                color: 'white',
                fontSize: '0.95rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.95rem' }}>
              发放日期 *
            </label>
            <input
              type="date"
              value={paymentForm.payment_date}
              onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                background: 'rgba(255, 255, 255, 0.18)',
                color: 'white',
                fontSize: '0.95rem'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setShowPaymentModal(false)}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                background: 'transparent',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: '600'
              }}
            >
              取消
            </button>
            <button
              onClick={async () => {
                if (!confirm(`确认发放 ${selectedSalaries.length} 条工资？`)) return;
                
                setLoading(true);
                try {
                  let successCount = 0;
                  for (const salaryId of selectedSalaries) {
                    const success = await courierSalaryService.paySalary(salaryId, {
                      payment_method: paymentForm.payment_method,
                      payment_reference: paymentForm.payment_reference,
                      payment_date: paymentForm.payment_date
                    });
                    if (success) successCount++;
                  }
                  
                  alert(`成功发放 ${successCount} 条工资！`);
                  await loadRecords();
                  setShowPaymentModal(false);
                  setSelectedSalaries([]);
                } catch (error) {
                  console.error('发放工资失败:', error);
                  alert('发放工资失败！');
                } finally {
                  setLoading(false);
                }
              }}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: '600'
              }}
            >
              确认发放
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
)}

