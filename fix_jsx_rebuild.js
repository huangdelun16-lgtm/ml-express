const fs = require("fs");
const path = "ml-express-merchant-web/src/pages/ProfilePage.tsx";
let content = fs.readFileSync(path, "utf8");

// 1. Re-balance the TimeWheelPicker component
// We want exactly 4 </div> closures before );
const pickerPattern = /handleMinuteChange\(String\(\(parseInt\(minute\) - 5 \+ 60\) % 60\)\)\)\s*}\s*style={{ background: .*? }}>▼<\/button>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<>\s*\n\s*\);\s*\n\s*};/s;
const pickerReplacement = `handleMinuteChange(String((parseInt(minute) - 5 + 60) % 60)))}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', width: '40px', height: '30px', borderRadius: '8px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >▼</button>
        </div>
      </div>
    </div>
  );
};`;

content = content.replace(pickerPattern, pickerReplacement);

// 2. Fix the isPartnerStore block closures
// We'll look for the end of the block and ensure it has the right number of divs.
// The block ends around line 3081.
// Let's use a very safe replacement.
const partnerBlockOld = `                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}`;

const partnerBlockNew = `                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}`;

// content = content.replace(partnerBlockOld, partnerBlockNew);
// Wait, I should use a more robust way to find the end of the block.

fs.writeFileSync(path, content);
console.log("Partial fix applied.");
