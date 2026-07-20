export type PosterColors = {
  /** 어두운 오버레이 / 진한 배경 */
  ink: string;
  /** 밝은 텍스트 / 크림톤 */
  paper: string;
  /** 포인트 악센트 */
  accent: string;
  /** 부드러운 보조 텍스트 */
  muted: string;
};

const FALLBACK: PosterColors = {
  ink: "#1a1410",
  paper: "#faf6f0",
  accent: "#c4a484",
  muted: "rgba(250,246,240,0.78)",
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function rgb(r: number, g: number, b: number, a = 1) {
  return a < 1
    ? `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`
    : `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

/** 이미지 URL에서 인스타 포스터용 색 조합을 뽑는다 (가성비: 작은 캔버스 샘플링) */
export async function extractPosterColors(imageUrl: string): Promise<PosterColors> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("IMAGE_LOAD"));
      img.src = imageUrl;
    });

    const w = 48;
    const h = 48;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return FALLBACK;
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;

    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    // 하단 1/3 + 모서리 위주로 샘플 (텍스트가 올라갈 영역)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const inBottom = y >= Math.floor(h * 0.55);
        const inCorner = (x < 8 || x > w - 9) && y < 12;
        if (!inBottom && !inCorner) continue;
        const i = (y * w + x) * 4;
        r += data[i]!;
        g += data[i + 1]!;
        b += data[i + 2]!;
        n++;
      }
    }
    if (!n) return FALLBACK;
    r /= n;
    g /= n;
    b /= n;

    // 밝기 기준으로 다크/라이트 모드 결정
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const accent = rgb(
      clamp(r * 0.55 + 80, 90, 210),
      clamp(g * 0.5 + 60, 70, 180),
      clamp(b * 0.45 + 40, 50, 150),
    );

    if (luma > 140) {
      // 밝은 사진 → 어두운 글자 / 크림 오버레이
      return {
        ink: rgb(clamp(r * 0.25, 20, 55), clamp(g * 0.22, 16, 48), clamp(b * 0.2, 12, 42)),
        paper: rgb(250, 246, 240),
        accent,
        muted: rgb(clamp(r * 0.35, 40, 90), clamp(g * 0.32, 36, 80), clamp(b * 0.28, 30, 70), 0.85),
      };
    }

    // 어두운 사진 → 밝은 글자
    return {
      ink: rgb(clamp(r * 0.35, 18, 50), clamp(g * 0.3, 14, 42), clamp(b * 0.28, 12, 38)),
      paper: rgb(250, 246, 240),
      accent: rgb(
        clamp(r * 0.4 + 140, 160, 230),
        clamp(g * 0.35 + 120, 140, 210),
        clamp(b * 0.3 + 100, 120, 190),
      ),
      muted: "rgba(250,246,240,0.78)",
    };
  } catch {
    return FALLBACK;
  }
}

export const PRESET_COLORS: Record<"cream" | "espresso" | "forest" | "berry", PosterColors> = {
  cream: {
    ink: "#2a2320",
    paper: "#faf6f0",
    accent: "#914321",
    muted: "rgba(42,35,32,0.72)",
  },
  espresso: {
    ink: "#14100e",
    paper: "#faf6f0",
    accent: "#e8c4a8",
    muted: "rgba(250,246,240,0.78)",
  },
  forest: {
    ink: "#0e1c14",
    paper: "#f2f7f2",
    accent: "#b8d8b8",
    muted: "rgba(242,247,242,0.78)",
  },
  berry: {
    ink: "#281018",
    paper: "#fdf1f4",
    accent: "#f0c2d0",
    muted: "rgba(253,241,244,0.78)",
  },
};
