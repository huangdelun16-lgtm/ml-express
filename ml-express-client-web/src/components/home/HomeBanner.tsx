import React, { useRef, useState, useEffect } from 'react';

const HomeBanner = () => {
  const bannerScrollRef = useRef<HTMLDivElement>(null);
  const [isBannerPaused, setIsBannerPaused] = useState(false);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  // 自动轮播逻辑
  useEffect(() => {
    let scrollInterval: NodeJS.Timeout;
    
    if (!isBannerPaused) {
      scrollInterval = setInterval(() => {
        if (bannerScrollRef.current) {
          const { scrollLeft, clientWidth, scrollWidth } = bannerScrollRef.current;
          const maxScroll = scrollWidth - clientWidth;
          
          let nextScrollLeft = scrollLeft + clientWidth;
          let nextIndex = currentBannerIndex + 1;
          
          if (nextScrollLeft > maxScroll) {
            nextScrollLeft = 0;
            nextIndex = 0;
          }
          
          bannerScrollRef.current.scrollTo({
            left: nextScrollLeft,
            behavior: 'smooth'
          });
          setCurrentBannerIndex(nextIndex);
        }
      }, 5000); // 5秒切换一次
    }

    return () => clearInterval(scrollInterval);
  }, [isBannerPaused, currentBannerIndex]);

  return (
    <div style={{
      position: 'relative',
      zIndex: 5,
      marginBottom: '40px',
      padding: '0 16px',
      maxWidth: '1200px',
      margin: '0 auto 40px auto',
      width: '100%'
    }}>
      <div
        ref={bannerScrollRef}
        style={{
          display: 'flex',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollBehavior: 'smooth',
          width: '100%',
          borderRadius: '16px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          position: 'relative',
          cursor: 'grab',
          WebkitOverflowScrolling: 'touch' as any,
        }}
        onMouseDown={(e) => {
          const element = e.currentTarget;
          element.style.cursor = 'grabbing';
        }}
        onMouseUp={(e) => {
          const element = e.currentTarget;
          element.style.cursor = 'grab';
        }}
        onMouseLeave={(e) => {
          const element = e.currentTarget;
          element.style.cursor = 'grab';
        }}
      >
        {/* 第一张卡片：地图追踪 */}
        <div
          style={{
            minWidth: '100%',
            scrollSnapAlign: 'start',
            height: '280px',
            borderRadius: '16px',
            overflow: 'hidden',
            position: 'relative',
            cursor: 'pointer',
            userSelect: 'none'
          }}
          onMouseDown={() => setIsBannerPaused(true)}
          onMouseUp={() => setIsBannerPaused(false)}
          onMouseLeave={() => setIsBannerPaused(false)}
          onClick={() => window.open('https://www.market-link-express.com', '_blank')}
        >
          <div style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 60%, #ffffff 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '60px',
              background: 'rgba(0,0,0,0.1)',
              clipPath: 'polygon(0 100%, 0 60%, 20% 50%, 40% 60%, 60% 50%, 80% 60%, 100% 50%, 100% 100%)'
            }}></div>
            
            <div style={{ flex: 1, zIndex: 2 }}>
              <img 
                src="/logo.png" 
                alt="Logo"
                style={{
                  width: '40px',
                  height: '40px',
                  marginBottom: '8px'
                }}
              />
              <h2 style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: '#1e293b',
                margin: '0 0 8px 0',
                lineHeight: '1.3',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                WebkitFontSmoothing: 'antialiased' as any,
                MozOsxFontSmoothing: 'grayscale' as any,
                WebkitTextSizeAdjust: '100%' as any,
                display: 'block',
                visibility: 'visible',
                opacity: 1
              }}>曼德勒同城快递<br/>极速送达</h2>
              <p style={{
                fontSize: '20px',
                color: '#4b5563',
                margin: '0 0 12px 0',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                WebkitFontSmoothing: 'antialiased' as any,
                MozOsxFontSmoothing: 'grayscale' as any,
                WebkitTextSizeAdjust: '100%' as any,
                display: 'block',
                visibility: 'visible',
                opacity: 1
              }}>5分钟接单 · 实时定位</p>
              <p style={{
                fontSize: '16px',
                color: 'rgba(30, 41, 59, 0.85)',
                margin: '0 0 16px 0',
                lineHeight: '20px',
                fontStyle: 'italic',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                WebkitFontSmoothing: 'antialiased' as any,
                MozOsxFontSmoothing: 'grayscale' as any,
                WebkitTextSizeAdjust: '100%' as any,
                display: 'block',
                visibility: 'visible',
                opacity: 1
              }}>မန္တလေးမြို့တွင်း မြန်ဆန်စွာပို့ဆောင်ပေးခြင်း</p>
            </div>
            
            <div style={{
              flex: '0.8',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1,
              position: 'relative'
            }}>
              <div style={{
                width: '100px',
                height: '210px',
                backgroundColor: '#1f2937',
                borderRadius: '14px',
                border: '2px solid #374151',
                transform: 'perspective(800px) rotateY(-15deg) rotateX(10deg) rotateZ(-5deg)',
                boxShadow: '10px 10px 20px rgba(0,0,0,0.4)',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div style={{
                  width: 'calc(100% - 6px)',
                  height: 'calc(100% - 6px)',
                  backgroundColor: '#f3f4f6',
                  margin: '3px',
                  borderRadius: '8px',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '40px',
                    left: '20px',
                    width: '40px',
                    height: '60px',
                    borderLeft: '2px dashed #3b82f6',
                    borderBottom: '2px dashed #3b82f6',
                    borderRadius: '10px'
                  }}></div>
                  <div style={{ position: 'absolute', top: '35px', left: '15px', fontSize: '10px' }}>🏠</div>
                  <div style={{ position: 'absolute', top: '80px', left: '40px', fontSize: '12px', backgroundColor: '#ffffff', borderRadius: '10px', padding: '2px' }}>🛵</div>
                  <div style={{ position: 'absolute', bottom: '40px', right: '20px', fontSize: '10px' }}>📍</div>
                  <div style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '5px',
                    right: '5px',
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    borderRadius: '6px',
                    padding: '4px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ fontSize: '8px', fontWeight: 'bold', color: '#333' }}>正在配送中...</div>
                    <div style={{ fontSize: '7px', color: '#666' }}>预计 15 分钟送达</div>
                  </div>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(to bottom, rgba(255,255,255,0.4) 0%, transparent 50%, rgba(255,255,255,0.1) 100%)',
                    pointerEvents: 'none'
                  }}></div>
                </div>
              </div>
              <div style={{
                position: 'absolute',
                top: '-10px',
                right: '-10px',
                fontSize: '24px',
                zIndex: 10
              }}>📦</div>
            </div>
          </div>
        </div>

        {/* 第二张卡片：地址填写 */}
        <div
          style={{
            minWidth: '100%',
            scrollSnapAlign: 'start',
            height: '280px',
            borderRadius: '16px',
            overflow: 'hidden',
            position: 'relative',
            cursor: 'pointer',
            userSelect: 'none'
          }}
          onMouseDown={() => setIsBannerPaused(true)}
          onMouseUp={() => setIsBannerPaused(false)}
          onMouseLeave={() => setIsBannerPaused(false)}
        >
          <div style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, #f3f4f6 0%, #ffffff 50%, #e5e7eb 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '80px',
              background: 'rgba(0,0,0,0.05)',
              clipPath: 'polygon(0 100%, 0 60%, 20% 50%, 40% 60%, 60% 50%, 80% 60%, 100% 50%, 100% 100%)'
            }}></div>
            
            <div style={{ flex: 1, zIndex: 2 }}>
              <h2 style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: '#1f2937',
                margin: '4px 0 8px 0',
                lineHeight: '1.3',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                WebkitFontSmoothing: 'antialiased' as any,
                MozOsxFontSmoothing: 'grayscale' as any,
                WebkitTextSizeAdjust: '100%' as any,
                display: 'block',
                visibility: 'visible',
                opacity: 1
              }}>一键填写地址<br/>极速上门取件</h2>
              <p style={{
                fontSize: '20px',
                color: '#4b5563',
                margin: '0 0 12px 0',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                WebkitFontSmoothing: 'antialiased' as any,
                MozOsxFontSmoothing: 'grayscale' as any,
                WebkitTextSizeAdjust: '100%' as any,
                display: 'block',
                visibility: 'visible',
                opacity: 1
              }}>实时定位 · 全城服务 · 30分钟送达</p>
              <p style={{
                fontSize: '16px',
                color: '#6b7280',
                margin: '0 0 16px 0',
                lineHeight: '20px',
                fontStyle: 'italic',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                WebkitFontSmoothing: 'antialiased' as any,
                MozOsxFontSmoothing: 'grayscale' as any,
                WebkitTextSizeAdjust: '100%' as any,
                display: 'block',
                visibility: 'visible',
                opacity: 1
              }}>မှန်ကန်သောလိပ်စာ ထည့်သွင်းလိုက်ရုံဖြင့် အမြန်ဆုံးလာရောက်ယူဆောင်ပေးခြင်း</p>
            </div>
            
            <div style={{
              flex: '0.8',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1,
              position: 'relative'
            }}>
              <div style={{
                width: '100px',
                height: '210px',
                backgroundColor: '#f9fafb',
                borderRadius: '14px',
                border: '2px solid #e5e7eb',
                transform: 'perspective(800px) rotateY(-15deg) rotateX(10deg) rotateZ(-5deg)',
                boxShadow: '10px 10px 20px rgba(0,0,0,0.2)',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div style={{
                  width: 'calc(100% - 6px)',
                  height: 'calc(100% - 6px)',
                  backgroundColor: '#ffffff',
                  margin: '3px',
                  borderRadius: '8px',
                  padding: '10px',
                  boxSizing: 'border-box' as any
                }}>
                  <div style={{
                    width: '100%',
                    height: '8px',
                    backgroundColor: '#e5e7eb',
                    borderRadius: '4px',
                    marginBottom: '8px'
                  }}></div>
                  <div style={{
                    width: '70%',
                    height: '8px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '4px',
                    marginBottom: '15px'
                  }}></div>
                  
                  <div style={{
                    border: '1px solid #3b82f6',
                    borderRadius: '6px',
                    padding: '8px',
                    marginBottom: '8px',
                    backgroundColor: '#eff6ff'
                  }}>
                    <div style={{ fontSize: '8px', color: '#1e40af' }}>请输入发件地址...</div>
                  </div>
                  <div style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    padding: '8px',
                    marginBottom: '8px'
                  }}>
                    <div style={{ fontSize: '8px', color: '#9ca3af' }}>请输入收件地址...</div>
                  </div>
                  
                  <div style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '10px',
                    right: '10px',
                    height: '24px',
                    backgroundColor: '#3b82f6',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: 'bold'
                  }}>
                    立即下单
                  </div>
                </div>
              </div>
              <div style={{
                position: 'absolute',
                top: '20px',
                right: '10px',
                fontSize: '24px',
                zIndex: 10
              }}>📝</div>
            </div>
          </div>
        </div>

        {/* 第三张卡片：上线促销 */}
        <div
          style={{
            minWidth: '100%',
            scrollSnapAlign: 'start',
            height: '280px',
            borderRadius: '16px',
            overflow: 'hidden',
            position: 'relative',
            cursor: 'pointer',
            userSelect: 'none'
          }}
          onMouseDown={() => setIsBannerPaused(true)}
          onMouseUp={() => setIsBannerPaused(false)}
          onMouseLeave={() => setIsBannerPaused(false)}
        >
          <div style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, #e2e8f0 0%, #f8fafc 50%, #ffffff 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ flex: 1, zIndex: 2 }}>
              <div style={{
                backgroundColor: '#1e293b',
                padding: '4px 12px',
                borderRadius: '4px',
                display: 'inline-block',
                marginBottom: '10px'
              }}>
                <span style={{
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  WebkitFontSmoothing: 'antialiased' as any,
                  MozOsxFontSmoothing: 'grayscale' as any,
                  WebkitTextSizeAdjust: '100%' as any,
                  display: 'inline-block',
                  visibility: 'visible',
                  opacity: 1
                }}>NEW LAUNCH</span>
              </div>
              
              <div style={{ margin: '10px 0' }}>
                <div style={{
                  fontSize: '28px',
                  fontWeight: 'bold',
                  color: '#2563eb',
                  marginBottom: '6px',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  WebkitFontSmoothing: 'antialiased' as any,
                  MozOsxFontSmoothing: 'grayscale' as any,
                  WebkitTextSizeAdjust: '100%' as any,
                  display: 'block',
                  visibility: 'visible',
                  opacity: 1
                }}>MDY同城2000MMK/一趟</div>
                <div style={{
                  fontSize: '16px',
                  color: '#64748b',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  WebkitFontSmoothing: 'antialiased' as any,
                  MozOsxFontSmoothing: 'grayscale' as any,
                  WebkitTextSizeAdjust: '100%' as any,
                  display: 'block',
                  visibility: 'visible',
                  opacity: 1
                }}>曼德勒市内统一价 · 活动仅1个月</div>
              </div>

              <div style={{ marginTop: '12px' }}>
                <div style={{
                  fontSize: '16px',
                  color: '#475569',
                  marginBottom: '4px',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  WebkitFontSmoothing: 'antialiased' as any,
                  MozOsxFontSmoothing: 'grayscale' as any,
                  WebkitTextSizeAdjust: '100%' as any,
                  display: 'block',
                  visibility: 'visible',
                  opacity: 1
                }}>📅 2026年1月1日正式启动</div>
                <div style={{
                  fontSize: '14px',
                  color: '#94a3b8',
                  fontStyle: 'italic',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  WebkitFontSmoothing: 'antialiased' as any,
                  MozOsxFontSmoothing: 'grayscale' as any,
                  WebkitTextSizeAdjust: '100%' as any,
                  display: 'block',
                  visibility: 'visible',
                  opacity: 1
                }}>Software စမ်းသပ်အသုံးပြုကာလအတွင်း MDY မြို့တွင်း 2000MMK/တစ်ကြိမ်</div>
              </div>
            </div>
            
            <div style={{
              flex: '0.8',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1,
              position: 'relative'
            }}>
              <div style={{
                width: '100px',
                height: '210px',
                backgroundColor: '#f1f5f9',
                borderRadius: '14px',
                border: '2px solid #cbd5e1',
                transform: 'perspective(800px) rotateY(-15deg) rotateX(10deg) rotateZ(-5deg)',
                boxShadow: '10px 10px 20px rgba(0,0,0,0.2)',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div style={{
                  width: 'calc(100% - 6px)',
                  height: 'calc(100% - 6px)',
                  backgroundColor: '#ffffff',
                  margin: '3px',
                  borderRadius: '8px',
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '20px',
                    backgroundColor: '#eff6ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '10px',
                    fontSize: '20px'
                  }}>🚀</div>
                  <div style={{
                    fontSize: '10px',
                    fontWeight: 'bold',
                    color: '#1e293b',
                    textAlign: 'center'
                  }}>GRAND OPENING</div>
                  <div style={{
                    fontSize: '8px',
                    color: '#64748b',
                    textAlign: 'center',
                    marginTop: '2px'
                  }}>Jan 1, 2026</div>
                  <div style={{
                    marginTop: '15px',
                    width: '100%',
                    height: '4px',
                    backgroundColor: '#e2e8f0',
                    borderRadius: '2px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: '60%',
                      height: '100%',
                      backgroundColor: '#3b82f6'
                    }}></div>
                  </div>
                  <div style={{
                    fontSize: '6px',
                    color: '#94a3b8',
                    marginTop: '4px',
                    textAlign: 'right',
                    width: '100%'
                  }}>Loading...</div>
                </div>
              </div>
              <div style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                fontSize: '24px',
                zIndex: 10
              }}>✨</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* 轮播指示点 */}
      <div style={{
        position: 'absolute',
        bottom: '15px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '8px',
        zIndex: 10
      }}>
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            style={{
              width: index === currentBannerIndex ? '24px' : '8px',
              height: '8px',
              borderRadius: '4px',
              backgroundColor: index === currentBannerIndex ? '#3b82f6' : 'rgba(0,0,0,0.2)',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onClick={() => {
              if (bannerScrollRef.current) {
                bannerScrollRef.current.scrollTo({
                  left: index * bannerScrollRef.current.clientWidth,
                  behavior: 'smooth'
                });
                setCurrentBannerIndex(index);
              }
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default HomeBanner;
