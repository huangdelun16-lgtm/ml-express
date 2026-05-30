const fs = require("fs");
const content = fs.readFileSync("ml-express-merchant-web/src/pages/TrackingPage.tsx", "utf8");
let stack = [];
let line = 1;
for (let i = 0; i < content.length; i++) {
  const char = content[i];
  if (char === "\n") line++;
  if (char === "{") stack.push(line);
  else if (char === "}") {
    if (stack.length > 0) stack.pop();
    else console.log(`Extra close brace at line ${line}`);
  }
}
console.log(`Unclosed braces:`, stack);
