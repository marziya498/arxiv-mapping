let students = [];

function processPdf() {
  const link = document.getElementById("pdfLink").value.trim();
  if (!link || !link.endsWith(".pdf")) {
    alert("请输入有效的 arXiv PDF 链接");
    return;
  }

  // 使用 pdf.js 加载并解析 PDF
  const loadingTask = pdfjsLib.getDocument(link);

  loadingTask.promise.then(pdf => {
    let textContent = "";

    // 提取每一页的文本
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      pdf.getPage(pageNum).then(page => {
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };

        page.render(renderContext).promise.then(() => {
          // 使用 pdfjsLib.getTextContent() 提取文本
          page.getTextContent().then(textContent => {
            textContent.items.forEach(item => {
              textContent += item.str + " ";
            });

            // 提取作者信息
            const authors = extractAuthors(textContent);
            students = classifyAndExtractStudents(authors);

            displayResults(students);
            enableDownloadLinks();
          });
        });
      });
    }
  }).catch(err => {
    console.error("PDF 加载失败:", err);
    alert("无法加载 PDF 文件，请检查链接是否有效。");
  });
}

// 提取作者信息（示例逻辑）
function extractAuthors(text) {
  const lines = text.split("\n");
  const authors = [];

  for (let line of lines) {
    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      let name = line.replace(/[-\*]/g, '').trim();
      let info = line.match(/\((.*?)\)/);
      let title = info ? info[1].toLowerCase() : "";

      authors.push({ name, title });
    }
  }

  return authors;
}

// 分类为学生或研究人员
function classifyAndExtractStudents(authors) {
  const result = [];

  for (let author of authors) {
    let isStudent = false;
    let degree = null;

    if (author.title.includes("student") || author.title.includes("candidate")) {
      isStudent = true;
    } else if (author.title.includes("phd")) {
      isStudent = true;
      degree = "PhD";
    } else if (author.title.includes("msc")) {
      isStudent = true;
      degree = "Master's";
    } else if (author.title.includes("bsc")) {
      isStudent = true;
      degree = "Bachelor's";
    }

    if (isStudent) {
      result.push({
        name: author.name,
        degree: degree,
        email: extractEmailFromText(author.name),
        website: null
      });
    }
  }

  return result;
}

// 模拟邮箱生成
function extractEmailFromText(name) {
  const names = name.split(" ");
  if (names.length >= 2) {
    return `${names[0].toLowerCase()}.${names[1].toLowerCase()}@university.edu`;
  }
  return null;
}

// 显示结果
function displayResults(students) {
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = '';

  if (students.length === 0) {
    resultsDiv.innerHTML = '<p>未找到学生作者。</p>';
    return;
  }

  const ul = document.createElement('ul');
  students.forEach(student => {
    const li = document.createElement('li');
    li.innerHTML = `
      <strong>${student.name}</strong><br/>
      学历: ${student.degree}<br/>
      邮箱: ${student.email}<br/>
      个人主页: ${student.website}
    `;
    ul.appendChild(li);
  });

  resultsDiv.appendChild(ul);
}

// 启用下载链接
function enableDownloadLinks() {
  const jsonLink = document.getElementById('downloadJson');
  const csvLink = document.getElementById('downloadCsv');

  const jsonBlob = new Blob([JSON.stringify(students, null, 2)], { type: 'application/json' });
  const csvBlob = new Blob([convertToCSV(students)], { type: 'text/csv' });

  jsonLink.href = URL.createObjectURL(jsonBlob);
  csvLink.href = URL.createObjectURL(csvBlob);
}

// 将数据转换为 CSV 格式
function convertToCSV(data) {
  const headers = Object.keys(data[0]);
  const rows = data.map(item => headers.map(header => item[header]).join(','));
  return [headers.join(','), ...rows].join('\n');
}
