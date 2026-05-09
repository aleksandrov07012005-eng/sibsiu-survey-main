import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  AlignmentType,
  BorderStyle,
  VerticalAlign,
  ImageRun,
} from "docx";
import sharp from "sharp";

interface QuestionWithResponses {
  id: number;
  text: string;
  type: string;
  order: number;
  options: Array<{
    id: number;
    option_text: string;
    option_order?: number;
    order?: number;
  }>;
  responses: Array<{
    optionId?: number;
    text?: string;
    count: number;
    percentage: number;
  }>;
}

interface ReportMetadata {
  title: string;
  organizationName?: string;
  surveyGoal: string;
  surveyObject: string;
  surveySubject: string;
  startDate: string;
  endDate: string;
  totalResponses: number;
  groupType: string;
  programCode?: string;
}

function createBorderedTable(rows: TableRow[]): Table {
  return new Table({
    rows,
    width: { size: 100, type: "pct" },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 6 },
      bottom: { style: BorderStyle.SINGLE, size: 6 },
      left: { style: BorderStyle.SINGLE, size: 6 },
      right: { style: BorderStyle.SINGLE, size: 6 },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 6 },
      insideVertical: { style: BorderStyle.SINGLE, size: 6 },
    },
  });
}

/** Экранирование текста для вставки в SVG/XML */
function escapeXml(text: string): string {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Генерация SVG вертикальной столбчатой диаграммы (стиль Excel), данные — доли в % (0–100) или количества */
function renderBarChartSvg(
  title: string,
  labels: string[],
  values: number[],
  options: {
    width?: number;
    height?: number;
    maxValue?: number;
    barColor?: string;
    showPercent?: boolean;
  } = {},
): string {
  const width = options.width ?? 460;
  const height = options.height ?? 280;
  const maxVal = options.maxValue ?? Math.max(...values, 1);
  const barColor = options.barColor ?? "#4472C4";
  const showPercent = options.showPercent ?? true;

  const padding = { top: 50, right: 30, bottom: 50, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const n = labels.length;
  const barGap = 8;
  const barWidth = n > 0 ? Math.max(20, (chartWidth - barGap * (n + 1)) / n) : 40;
  const titleShort = title.length > 90 ? title.slice(0, 87) + "..." : title;

  const yTicks = 5;
  const lines: string[] = [];

  for (let i = 0; i <= yTicks; i++) {
    const y = padding.top + (chartHeight * (yTicks - i)) / yTicks;
    lines.push(
      `<line x1="${padding.left}" y1="${y}" x2="${padding.left + chartWidth}" y2="${y}" stroke="#e0e0e0" stroke-width="1"/>`,
    );
  }

  const barAreaWidth = barWidth * n + barGap * (n + 1);
  const startX = padding.left + (chartWidth - barAreaWidth) / 2 + barGap;
  const zeroY = padding.top + chartHeight;

  const bars: string[] = [];
  const labelTexts: string[] = [];
  const valueTexts: string[] = [];

  for (let i = 0; i < n; i++) {
    const x = startX + i * (barWidth + barGap);
    const val = values[i] ?? 0;
    const h = maxVal > 0 ? (val / maxVal) * chartHeight : 0;
    const y = zeroY - h;
    bars.push(
      `<rect x="${x}" y="${y}" width="${barWidth}" height="${h}" fill="${barColor}" stroke="#2f5496" stroke-width="1"/>`,
    );
    const label = labels[i];
    const shortLabel =
      typeof label === "string" && label.length > 18
        ? label.slice(0, 15) + "..."
        : label;
    labelTexts.push(
      `<text x="${x + barWidth / 2}" y="${zeroY + 16}" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#333">${escapeXml(shortLabel)}</text>`,
    );
    const valStr = showPercent ? `${Math.round(val)}%` : String(Math.round(val));
    valueTexts.push(
      `<text x="${x + barWidth / 2}" y="${y - 6}" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#333">${escapeXml(valStr)}</text>`,
    );
  }

  const yAxisLabels: string[] = [];
  for (let i = 0; i <= yTicks; i++) {
    const y = padding.top + (chartHeight * (yTicks - i)) / yTicks;
    const val = ((maxVal * i) / yTicks).toFixed(0);
    yAxisLabels.push(
      `<text x="${padding.left - 6}" y="${y + 4}" text-anchor="end" font-family="Arial, sans-serif" font-size="10" fill="#333">${escapeXml(showPercent ? val + "%" : val)}</text>`,
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="white"/>
  <text x="${width / 2}" y="24" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#333">${escapeXml(titleShort)}</text>
  ${lines.join("\n  ")}
  ${bars.join("\n  ")}
  ${yAxisLabels.join("\n  ")}
  ${labelTexts.join("\n  ")}
  ${valueTexts.join("\n  ")}
</svg>`;
}

/** Горизонтальная столбчатая диаграмма: ось ординат — подписи (Вопрос 1, 2, …), ось абсцисс — шкала 0..maxValue (баллы) */
function renderHorizontalBarChartSvg(
  title: string,
  labels: string[],
  values: number[],
  options: {
    width?: number;
    height?: number;
    maxValue?: number;
    barColor?: string;
  } = {},
): string {
  const width = options.width ?? 460;
  const height = options.height ?? 280;
  const maxVal = options.maxValue ?? Math.max(...values, 1);
  const barColor = options.barColor ?? "#4472C4";

  const padding = { top: 40, right: 50, bottom: 40, left: 120 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const n = labels.length;
  if (n === 0) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="white"/>
  <text x="${width / 2}" y="${height / 2}" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#333">Нет данных</text>
</svg>`;
  }

  const gap = 4;
  const rowHeight = (chartHeight - 8) / n;
  const barHeight = Math.max(8, rowHeight - 4);
  const zeroX = padding.left;
  const titleShort = title.length > 80 ? title.slice(0, 77) + "..." : title;
  const round = (v: number) => Math.round(v);

  const xTicks = 5;
  const gridLines: string[] = [];
  for (let i = 0; i <= xTicks; i++) {
    const x = round(padding.left + (chartWidth * i) / xTicks);
    gridLines.push(
      `<line x1="${x}" y1="${padding.top}" x2="${x}" y2="${round(padding.top + chartHeight)}" stroke="#e0e0e0" stroke-width="1"/>`,
    );
  }

  const bars: string[] = [];
  const yLabelTexts: string[] = [];
  const valueTexts: string[] = [];

  for (let i = 0; i < n; i++) {
    const rowY = padding.top + gap + i * rowHeight;
    const y = round(rowY + rowHeight / 2);
    const val = values[i] ?? 0;
    const barLen = maxVal > 0 ? (val / maxVal) * chartWidth : 0;
    const barY = round(rowY + (rowHeight - barHeight) / 2);
    const barW = Math.max(0, round(barLen));
    bars.push(
      `<rect x="${zeroX}" y="${barY}" width="${barW}" height="${round(barHeight)}" fill="${barColor}" stroke="#2f5496" stroke-width="1"/>`,
    );
    const shortLabel =
      typeof labels[i] === "string" && (labels[i] as string).length > 16
        ? (labels[i] as string).slice(0, 13) + "..."
        : labels[i];
    yLabelTexts.push(
      `<text x="${padding.left - 8}" y="${y + 4}" text-anchor="end" font-family="Arial, sans-serif" font-size="11" fill="#333">${escapeXml(String(shortLabel))}</text>`,
    );
    const valStr = val.toFixed(1);
    const valX = zeroX + barW + 6;
    valueTexts.push(
      `<text x="${valX}" y="${y + 4}" text-anchor="start" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#333">${escapeXml(valStr)}</text>`,
    );
  }

  const xAxisLabels: string[] = [];
  for (let i = 0; i <= xTicks; i++) {
    const x = round(padding.left + (chartWidth * i) / xTicks);
    const val = ((maxVal * i) / xTicks).toFixed(1);
    xAxisLabels.push(
      `<text x="${x}" y="${round(padding.top + chartHeight + 18)}" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#333">${escapeXml(val)}</text>`,
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="white"/>
  <text x="${width / 2}" y="24" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#333">${escapeXml(titleShort)}</text>
  ${gridLines.join("\n  ")}
  ${bars.join("\n  ")}
  ${yLabelTexts.join("\n  ")}
  ${valueTexts.join("\n  ")}
  ${xAxisLabels.join("\n  ")}
</svg>`;
}

/** Конвертация SVG в PNG (sharp). Фиксированный размер для стабильного отображения в Word. */
async function svgToPngBuffer(svg: string, outputWidth = 460, outputHeight = 280): Promise<Buffer> {
  const buf = Buffer.from(svg, "utf-8");
  return sharp(buf)
    .resize(outputWidth, outputHeight)
    .flatten({ background: "#ffffff" })
    .png()
    .toBuffer();
}

/** Генерация PNG-буфера диаграммы локально (без canvas и без внешних API) */
async function generateChartBuffer(
  title: string,
  labels: string[],
  values: number[],
  options: { maxValue?: number; showPercent?: boolean } = {},
): Promise<Buffer> {
  const svg = renderBarChartSvg(title, labels, values, {
    width: 460,
    height: 280,
    maxValue: options.maxValue,
    showPercent: options.showPercent ?? true,
  });
  return svgToPngBuffer(svg);
}

export async function generateDocxReport(
  metadata: ReportMetadata,
  questions: QuestionWithResponses[],
): Promise<Buffer> {
  try {
    const sections: any[] = [];

    sections.push(
      new Paragraph({
        text: "Министерство науки и высшего образования Российской Федерации",
        alignment: AlignmentType.CENTER,
        spacing: { line: 240, after: 0 },
        size: 22,
      }),
    );
    sections.push(
      new Paragraph({
        text: "Федеральное государственное бюджетное образовательное учреждение",
        alignment: AlignmentType.CENTER,
        spacing: { line: 240, after: 0 },
        size: 22,
      }),
    );
    sections.push(
      new Paragraph({
        text: "высшего образования",
        alignment: AlignmentType.CENTER,
        spacing: { line: 240, after: 0 },
        size: 22,
      }),
    );
    sections.push(
      new Paragraph({
        text: `«${metadata.organizationName || "Сибирский государственный индустриальный университет"}»`,
        alignment: AlignmentType.CENTER,
        spacing: { line: 240, after: 600 },
        size: 22,
      }),
    );
    sections.push(
      new Paragraph({
        text: "ОТЧЕТ",
        alignment: AlignmentType.CENTER,
        bold: true,
        spacing: { line: 360, after: 120 },
        size: 28,
      }),
    );
    sections.push(
      new Paragraph({
        text: "о результатах проведения анкетирования обучающихся",
        alignment: AlignmentType.CENTER,
        spacing: { line: 360, after: 120 },
        size: 22,
      }),
    );
    sections.push(
      new Paragraph({
        text: "по образовательной программе",
        alignment: AlignmentType.CENTER,
        spacing: { line: 360, after: 120 },
        size: 22,
      }),
    );
    sections.push(
      new Paragraph({
        text: `«${metadata.title}»`,
        alignment: AlignmentType.CENTER,
        bold: true,
        spacing: { line: 360, after: 120 },
        size: 22,
      }),
    );
    if (metadata.programCode) {
      sections.push(
        new Paragraph({
          text: `(${metadata.programCode})`,
          alignment: AlignmentType.CENTER,
          spacing: { line: 360, after: 800 },
          size: 22,
        }),
      );
    } else {
      sections.push(
        new Paragraph({
          text: "",
          spacing: { after: 800 },
        }),
      );
    }
    sections.push(
      new Paragraph({
        text: "Новокузнецк",
        alignment: AlignmentType.CENTER,
        spacing: { line: 360, after: 120 },
        size: 22,
      }),
    );
    const currentYear = new Date().getFullYear().toString();
    sections.push(
      new Paragraph({
        text: currentYear,
        alignment: AlignmentType.CENTER,
        spacing: { line: 360, after: 0 },
        size: 22,
      }),
    );
    sections.push(new Paragraph({ text: "", pageBreakBefore: true }));
    sections.push(
      new Paragraph({
        text: "ОТЧЕТ",
        alignment: AlignmentType.CENTER,
        bold: true,
        spacing: { line: 360, after: 120 },
        size: 22,
      }),
    );
    sections.push(
      new Paragraph({
        text: "о результатах проведения анкетирования обучающихся",
        alignment: AlignmentType.CENTER,
        spacing: { line: 360, after: 120 },
        size: 22,
      }),
    );
    sections.push(
      new Paragraph({
        text: "по образовательной программе",
        alignment: AlignmentType.CENTER,
        spacing: { line: 360, after: 120 },
        size: 22,
      }),
    );
    sections.push(
      new Paragraph({
        text: `«${metadata.title}»`,
        alignment: AlignmentType.CENTER,
        bold: true,
        spacing: { line: 360, after: 0 },
        size: 22,
      }),
    );
    if (metadata.programCode) {
      sections.push(
        new Paragraph({
          text: `(${metadata.programCode})`,
          alignment: AlignmentType.CENTER,
          spacing: { line: 360, after: 400 },
          size: 22,
        }),
      );
    } else {
      sections.push(
        new Paragraph({
          text: "",
          spacing: { after: 400 },
        }),
      );
    }
    sections.push(
      new Paragraph({
        text: `Цель анкетирования: ${metadata.surveyGoal}`,
        spacing: { line: 360, after: 200 },
        alignment: AlignmentType.JUSTIFIED,
        size: 22,
      }),
    );
    sections.push(
      new Paragraph({
        text: `Объект анкетирования: ${metadata.surveyObject}`,
        spacing: { line: 360, after: 200 },
        alignment: AlignmentType.JUSTIFIED,
        size: 22,
      }),
    );
    sections.push(
      new Paragraph({
        text: `Предмет анкетирования: ${metadata.surveySubject}`,
        spacing: { line: 360, after: 200 },
        alignment: AlignmentType.JUSTIFIED,
        size: 22,
      }),
    );
    sections.push(
      new Paragraph({
        text: `В рамках внутренней системы оценки качества образования в СибГИУ с ${metadata.startDate} по ${metadata.endDate} было проведено анкетирование обучающихся.`,
        spacing: { line: 360, after: 200 },
        alignment: AlignmentType.JUSTIFIED,
        size: 22,
      }),
    );
    sections.push(
      new Paragraph({
        text: `Для проведения анкетирования отделом качества образования СибГИУ была разработана анкета «Оценка условий, содержания, организации и качества образовательного процесса в целом и отдельных дисциплин (модулей) и практик».`,
        spacing: { line: 360, after: 200 },
        alignment: AlignmentType.JUSTIFIED,
        size: 22,
      }),
    );
    sections.push(
      new Paragraph({
        text: `В анкетировании принимали участие обучающиеся по основным образовательным программам среднего профессионального и высшего образования по очной, очно-заочной и заочной формам обучения.`,
        spacing: { line: 360, after: 200 },
        alignment: AlignmentType.JUSTIFIED,
        size: 22,
      }),
    );
    sections.push(
      new Paragraph({
        text: `Анкетирование проводилось в Системе управления обучением «Moodle» СибГИУ (далее – СУО «Moodle»).`,
        spacing: { line: 360, after: 200 },
        alignment: AlignmentType.JUSTIFIED,
        size: 22,
      }),
    );
    sections.push(
      new Paragraph({
        text: `Респондентам было предложено ответить на ${questions.length} вопросов анкеты, касающихся условий, содержания, организации и качества образовательного процесса в СибГИУ.`,
        spacing: { line: 360, after: 200 },
        alignment: AlignmentType.JUSTIFIED,
        size: 22,
      }),
    );
    sections.push(
      new Paragraph({
        text: `В отчете представлены результаты анкетирования обучающихся по образовательной программе «${metadata.title}»${metadata.programCode ? ` (${metadata.programCode})` : ""}.`,
        spacing: { line: 360, after: 0 },
        alignment: AlignmentType.JUSTIFIED,
        size: 22,
      }),
    );
    sections.push(new Paragraph({ text: "", pageBreakBefore: true }));
    sections.push(
      new Paragraph({
        text: `Перечень вопросов анкеты «Оценка условий, содержания, организации и качества образовательного процесса в целом и отдельных дисциплин (модулей) и практик»`,
        alignment: AlignmentType.CENTER,
        bold: true,
        spacing: { line: 360, after: 200 },
        size: 22,
      }),
    );
    const questionRows: TableRow[] = [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                text: "№\nп/п",
                bold: true,
                alignment: AlignmentType.CENTER,
                size: 20,
              }),
            ],
            shading: { fill: "D3D3D3" },
            verticalAlign: VerticalAlign.CENTER,
            width: { size: 10, type: "pct" },
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: "Вопрос",
                bold: true,
                alignment: AlignmentType.CENTER,
                size: 20,
              }),
            ],
            shading: { fill: "D3D3D3" },
            verticalAlign: VerticalAlign.CENTER,
            width: { size: 55, type: "pct" },
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: "Варианты ответов",
                bold: true,
                alignment: AlignmentType.CENTER,
                size: 20,
              }),
            ],
            shading: { fill: "D3D3D3" },
            verticalAlign: VerticalAlign.CENTER,
            width: { size: 35, type: "pct" },
          }),
        ],
      }),
    ];
    questions.forEach((question, index) => {
      const sortedOptions = (question.options || []).sort(
        (a: any, b: any) =>
          (a.option_order || a.order || 0) - (b.option_order || b.order || 0),
      );
      const optionsText = sortedOptions
        .map(
          (opt: any, idx: number) =>
            `Вариант ${idx + 1}: ${opt.option_text || "-"}`,
        )
        .join("\n");
      questionRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  text: (index + 1).toString(),
                  alignment: AlignmentType.CENTER,
                  size: 20,
                }),
              ],
              verticalAlign: VerticalAlign.TOP,
              width: { size: 10, type: "pct" },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  text: question.text || "-",
                  alignment: AlignmentType.LEFT,
                  size: 20,
                }),
              ],
              verticalAlign: VerticalAlign.TOP,
              width: { size: 55, type: "pct" },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  text: optionsText,
                  alignment: AlignmentType.LEFT,
                  size: 20,
                }),
              ],
              verticalAlign: VerticalAlign.TOP,
              width: { size: 35, type: "pct" },
            }),
          ],
        }),
      );
    });
    sections.push(createBorderedTable(questionRows));
    sections.push(new Paragraph({ text: "", pageBreakBefore: true }));
    sections.push(
      new Paragraph({
        text: "Результаты анкетирования",
        alignment: AlignmentType.CENTER,
        bold: true,
        spacing: { line: 360, after: 200 },
        size: 22,
      }),
    );
    for (const [index, question] of questions.entries()) {
      const isLikertLike =
        question.type === "likert" ||
        question.responses.some(
          (r) =>
            r.optionId &&
            parseInt(r.text || r.optionId.toString() || "0") >= 1 &&
            parseInt(r.text || r.optionId.toString() || "0") <= 5,
        );
      if (isLikertLike || question.responses.length >= 2) {
        try {
          const chartTitle = `Вопрос ${index + 1}. ${question.text.slice(0, 80)}${question.text.length > 80 ? "..." : ""}`;
          const labels = question.responses.map((r, idx) => {
            const opt = question.options?.find((o: { id: number }) => o.id === r.optionId);
            return opt?.option_text ?? r.text ?? `Вариант ${r.optionId ?? idx + 1}`;
          });
          const dataValues = question.responses.map((r) => r.percentage);

          const chartBuffer = await generateChartBuffer(chartTitle, labels, dataValues, {
            maxValue: 100,
            showPercent: true,
          });
          sections.push(
            new Paragraph({
              children: [
                new ImageRun({
                  type: "png",
                  data: chartBuffer,
                  transformation: {
                    width: 460,
                    height: 280,
                  },
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 400, after: 400 },
            }),
          );
        } catch (err) {
          console.error(`Ошибка генерации диаграммы для вопроса ${index + 1}:`, err);
        }
      }
    }
    const resultRows: TableRow[] = [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                text: "№\nп/п",
                bold: true,
                alignment: AlignmentType.CENTER,
                size: 20,
              }),
            ],
            shading: { fill: "D3D3D3" },
            verticalAlign: VerticalAlign.CENTER,
            width: { size: 10, type: "pct" },
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: "Вопрос",
                bold: true,
                alignment: AlignmentType.CENTER,
                size: 20,
              }),
            ],
            shading: { fill: "D3D3D3" },
            verticalAlign: VerticalAlign.CENTER,
            width: { size: 75, type: "pct" },
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: "Показатель удовлетворенности",
                bold: true,
                alignment: AlignmentType.CENTER,
                size: 20,
              }),
            ],
            shading: { fill: "D3D3D3" },
            verticalAlign: VerticalAlign.CENTER,
            width: { size: 15, type: "pct" },
          }),
        ],
      }),
    ];
    questions.forEach((question, index) => {
      const score = calculateSatisfactionScore(question.responses);
      resultRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  text: (index + 1).toString(),
                  alignment: AlignmentType.CENTER,
                  size: 20,
                }),
              ],
              verticalAlign: VerticalAlign.CENTER,
              width: { size: 10, type: "pct" },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  text: question.text || "-",
                  alignment: AlignmentType.LEFT,
                  size: 20,
                }),
              ],
              verticalAlign: VerticalAlign.TOP,
              width: { size: 75, type: "pct" },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  text: score.toFixed(1),
                  alignment: AlignmentType.CENTER,
                  size: 20,
                }),
              ],
              verticalAlign: VerticalAlign.CENTER,
              width: { size: 15, type: "pct" },
            }),
          ],
        }),
      );
    });
    sections.push(createBorderedTable(resultRows));
    const avgScore = calculateAverageScore(questions);
    sections.push(
      new Paragraph({
        text: "",
        spacing: { after: 200 },
      }),
    );
    sections.push(
      new Paragraph({
        text: `Вопрос № ${questions.length} «Ваши предложения по улучшению качества образовательного процесса в целом и отдельных дисциплин и практик в СибГИУ» предоставил возможность обучающимся по образовательной программе внести предложения по улучшению качества образовательного процесса в целом и отдельных дисциплин и практик в СибГИУ.`,
        spacing: { line: 360, after: 200 },
        alignment: AlignmentType.JUSTIFIED,
        size: 22,
      }),
    );
    sections.push(
      new Paragraph({
        text: `Ответы на данный вопрос были представленны в свободной форме и позволили определить возможности для улучшения качества образовательного процесса в целом и отдельных дисциплин и практик в СибГИУ.`,
        spacing: { line: 360, after: 200 },
        alignment: AlignmentType.JUSTIFIED,
        size: 22,
      }),
    );
    sections.push(
      new Paragraph({
        text: `Средний балл удовлетворенности по образовательной программе – ${avgScore.toFixed(1)}.`,
        spacing: { line: 360, after: 0 },
        alignment: AlignmentType.JUSTIFIED,
        size: 22,
        bold: true,
      }),
    );

    // Раздел «Диаграммы результатов анкетирования»
    sections.push(new Paragraph({ text: "", pageBreakBefore: true }));
    sections.push(
      new Paragraph({
        text: "Диаграммы результатов анкетирования",
        alignment: AlignmentType.CENTER,
        bold: true,
        spacing: { line: 360, after: 400 },
        size: 22,
      }),
    );

    // Сводная диаграмма средних баллов
    const avgLabels = questions.map((_, i) => `Вопрос ${i + 1}`);
    const avgValues = questions.map((q) => calculateSatisfactionScore(q.responses));
    if (questions.length > 0) {
      try {
        const avgChartSvg = renderHorizontalBarChartSvg(
          "Средние баллы по вопросам",
          avgLabels,
          avgValues,
          { width: 460, height: 280, maxValue: 5 },
        );
        const avgChartBuffer = await svgToPngBuffer(avgChartSvg);
        sections.push(
          new Paragraph({
            children: [
              new ImageRun({
                type: "png",
                data: avgChartBuffer,
                transformation: { width: 460, height: 280 },
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 400 },
          }),
        );
      } catch (err) {
        console.error("Ошибка генерации диаграммы «Средние баллы по вопросам»:", err);
      }
    }

    const doc = new Document({
      sections: [
        {
          children: sections,
          properties: {},
        },
      ],
    });
    const buffer = await Packer.toBuffer(doc);
    return buffer;
  } catch (error) {
    console.error("Error generating DOCX report:", error);
    throw error;
  }
}

function calculateSatisfactionScore(
  responses: Array<{
    optionId?: number;
    text?: string;
    count: number;
    percentage: number;
  }>,
): number {
  if (responses.length === 0) return 0;
  let totalScore = 0;
  let totalCount = 0;
  responses.forEach((response) => {
    const numValue = parseInt(
      response.text || response.optionId?.toString() || "",
    );
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 5) {
      totalScore += numValue * response.count;
      totalCount += response.count;
    }
  });
  if (totalCount === 0) return 0;
  return totalScore / totalCount;
}

/** Проверка, что вопрос — по шкале 1–5 (likert и т.п.) */
function isScale1To5Question(question: QuestionWithResponses): boolean {
  if (question.type === "likert") return true;
  return question.responses.some((r) => {
    const n = parseInt(r.text || r.optionId?.toString() || "", 10);
    return !isNaN(n) && n >= 1 && n <= 5;
  });
}

/** Распределение ответов по шкале 1–5: [count для 1, для 2, …, для 5] */
function getScale1To5Values(question: QuestionWithResponses): number[] {
  const values = [0, 0, 0, 0, 0];
  question.responses.forEach((r) => {
    const n = parseInt(r.text || r.optionId?.toString() || "", 10);
    if (!isNaN(n) && n >= 1 && n <= 5) values[n - 1] += r.count;
  });
  return values;
}
function calculateAverageScore(questions: QuestionWithResponses[]): number {
  if (questions.length === 0) return 0;
  const scores = questions.map((q) => calculateSatisfactionScore(q.responses));
  const sum = scores.reduce((a, b) => a + b, 0);
  return sum / scores.length;
}