const fs = require("fs");
const content = fs.readFileSync("ml-express-merchant-web/src/pages/ProfilePage.tsx", "utf8");
let stack = [];
let line = 1;
let i = 0;

while (i < content.length) {
  const char = content[i];
  if (char === "\n") line++;

  if (char === "\"" || char === "'" || char === "`") {
    const quote = char; i++;
    while (i < content.length && (content[i] !== quote || content[i-1] === "\\")) {
      if (content[i] === "\n") line++;
      i++;
    }
    i++; continue;
  }

  if (content.substr(i, 2) === "={") {
    i += 2;
    let depth = 1;
    while (i < content.length && depth > 0) {
      if (content[i] === "{") depth++;
      else if (content[i] === "}") depth--;
      else if (content[i] === "\n") line++;
      i++;
    }
    continue;
  }

  if (content.substr(i, 4) === "<div") { stack.push({ type: "div", line }); i += 4; }
  else if (content.substr(i, 6) === "</div>") { 
    if (stack.length > 0 && stack[stack.length-1].type === "div") {
      stack.pop();
    } else {
      console.log(`EXTRA CLOSE div at line ${line}, top is ${stack.length > 0 ? stack[stack.length-1].type : "EMPTY"}`);
    }
    i += 6; 
  }
  else if (content.substr(i, 2) === "<>") { stack.push({ type: "fragment", line }); i += 2; }
  else if (content.substr(i, 3) === "</>") { 
    if (stack.length > 0 && stack[stack.length-1].type === "fragment") {
      stack.pop();
    } else {
      console.log(`EXTRA CLOSE fragment at line ${line}, top is ${stack.length > 0 ? stack[stack.length-1].type : "EMPTY"}`);
    }
    i += 3; 
  }
  else if (char === "{") { stack.push({ type: "brace", line }); i++; }
  else if (char === "}") { 
    if (stack.length > 0 && stack[stack.length-1].type === "brace") {
      stack.pop();
    } else {
      console.log(`EXTRA CLOSE brace at line ${line}, top is ${stack.length > 0 ? stack[stack.length-1].type : "EMPTY"}`);
    }
    i++;
  }
  else i++;
}
console.log("Unclosed stack:", stack);
