import { useEffect, useRef, type ReactNode, type CSSProperties, type RefObject } from "react";

// ---------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------

const VERTEX_SHADER = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

// The ripple/turbulence + refracted sampling only happens inside a fixed
// rounded rectangle (uGlassRect). Outside that rectangle the plain,
// undistorted texture is shown. The rectangle does not track the mouse —
// its position/size is set from React (either a fixed prop or measured off
// a DOM element via glassTargetRef).
const FRAGMENT_SHADER = `
  precision mediump float;
  uniform vec3 iResolution;
  uniform float iTime;
  uniform sampler2D iChannel0;
  uniform float uTurbulence;
  uniform float uSpeed;
  uniform vec4 uGlassRect;     // x, y, width, height — top-left origin, normalized [0,1]
  uniform float uCornerRadius; // pixels
  uniform float uEdgeSoftness; // pixels

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 4; i++) {
      value += amplitude * noise(p);
      p *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  // Standard rounded-box signed distance field: negative inside, 0 at the
  // edge, positive outside. p is relative to the box's center.
  float roundedBoxSDF(vec2 p, vec2 halfSize, float radius) {
    vec2 d = abs(p) - halfSize + vec2(radius);
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - radius;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;

    // --- Static glass mask (no mouse involved) ---
    vec2 rectTopLeftPx = uGlassRect.xy * iResolution.xy;
    vec2 rectSizePx = uGlassRect.zw * iResolution.xy;
    vec2 rectCenterPx = rectTopLeftPx + rectSizePx * 0.5;

    // gl_FragCoord is bottom-up; the rect was measured in top-down DOM space.
    vec2 pixelPos = vec2(gl_FragCoord.x, iResolution.y - gl_FragCoord.y);

    float dist = roundedBoxSDF(pixelPos - rectCenterPx, rectSizePx * 0.5, uCornerRadius);
    float mask = 1.0 - smoothstep(0.0, max(uEdgeSoftness, 0.0001), dist);

    vec4 plainColor = texture2D(iChannel0, uv);

    if (mask <= 0.001) {
      gl_FragColor = plainColor;
      return;
    }

    // --- Liquid turbulence + refracted sampling, only computed where it's visible ---
    vec2 turbulentOffset = vec2(
      fbm(uv * 3.0 + vec2(iTime * uSpeed, 0.0)),
      fbm(uv * 3.0 + vec2(0.0, iTime * uSpeed) + 10.0)
    ) - 0.5;
    vec2 warpedUv = uv + turbulentOffset * uTurbulence;

    vec4 glassColor = vec4(0.0);
    float total = 0.0;
    const float SAMPLE_RANGE = 3.0;
    for (float x = -SAMPLE_RANGE; x <= SAMPLE_RANGE; x++) {
      for (float y = -SAMPLE_RANGE; y <= SAMPLE_RANGE; y++) {
        vec2 offset = vec2(x, y) * 0.5 / iResolution.xy;
        glassColor += texture2D(iChannel0, offset + warpedUv);
        total += 1.0;
      }
    }
    glassColor /= total;

    // Soft rim highlight along the inside edge of the glass area.
    float rim = 1.0 - smoothstep(0.0, uEdgeSoftness * 3.0, abs(dist));
    glassColor = clamp(glassColor + vec4(rim) * 0.12, 0.0, 1.0);

    gl_FragColor = mix(plainColor, glassColor, mask);
  }
`;

// ---------------------------------------------------------------------------
// Hook: owns the WebGL lifecycle
// ---------------------------------------------------------------------------

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export interface GlassRect {
  /** Fraction of canvas width from the left edge, 0–1. */
  x: number;
  /** Fraction of canvas height from the top edge, 0–1. */
  y: number;
  /** Fraction of canvas width, 0–1. */
  width: number;
  /** Fraction of canvas height, 0–1. */
  height: number;
}

interface LiquidGlassOptions {
  turbulence?: number;
  speed?: number;
  glassRect?: GlassRect;
  glassTargetRef?: RefObject<HTMLElement | null>;
  cornerRadius?: number;
  edgeSoftness?: number;
}

const DEFAULT_GLASS_RECT: GlassRect = { x: 0.05, y: 0.05, width: 0.9, height: 0.9 };

function useLiquidGlass(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  imageSrc: string,
  {
    turbulence = 0.02,
    speed = 0.15,
    glassRect = DEFAULT_GLASS_RECT,
    glassTargetRef,
    cornerRadius = 30,
    edgeSoftness = 24,
  }: LiquidGlassOptions = {}
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl");
    if (!gl) {
      console.error("WebGL is not supported in this browser.");
      return;
    }

    let destroyed = false;
    let animationFrame = 0;
    let textureReady = false;

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const program = gl.createProgram();
    if (!vs || !fs || !program) {
      console.error("LiquidGlassBackground: failed to initialize WebGL program.");
      return;
    }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );
    const positionLoc = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    const uniforms = {
      resolution: gl.getUniformLocation(program, "iResolution"),
      time: gl.getUniformLocation(program, "iTime"),
      texture: gl.getUniformLocation(program, "iChannel0"),
      turbulence: gl.getUniformLocation(program, "uTurbulence"),
      speed: gl.getUniformLocation(program, "uSpeed"),
      glassRect: gl.getUniformLocation(program, "uGlassRect"),
      cornerRadius: gl.getUniformLocation(program, "uCornerRadius"),
      edgeSoftness: gl.getUniformLocation(program, "uEdgeSoftness"),
    };

    const texture = gl.createTexture();
    const image = new Image();
    image.crossOrigin = "anonymous"; // required for remote images + texImage2D
    image.src = imageSrc;
    image.onload = () => {
      if (destroyed) return;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      textureReady = true;
    };
    image.onerror = () => {
      console.error("LiquidGlassBackground: failed to load image", imageSrc);
    };

    // Size the drawing buffer to the element's actual CSS size (capped DPR
    // for perf) rather than window size, since this is an embeddable
    // background, not a full-page canvas.
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    if (glassTargetRef?.current) {
      resizeObserver.observe(glassTargetRef.current);
    }

    // Compute the normalized glass rect for this frame: either measured
    // live off glassTargetRef (so it tracks that element's layout), or the
    // fixed fractional glassRect prop. Static either way — never the mouse.
    const computeGlassRect = (): GlassRect => {
      const target = glassTargetRef?.current;
      if (!target) return glassRect;
      const targetBox = target.getBoundingClientRect();
      const canvasBox = canvas.getBoundingClientRect();
      if (canvasBox.width === 0 || canvasBox.height === 0) return glassRect;
      return {
        x: (targetBox.left - canvasBox.left) / canvasBox.width,
        y: (targetBox.top - canvasBox.top) / canvasBox.height,
        width: targetBox.width / canvasBox.width,
        height: targetBox.height / canvasBox.height,
      };
    };

    const startTime = performance.now();
    const render = () => {
      if (destroyed) return;
      const currentTime = (performance.now() - startTime) / 1000;
      const rect = computeGlassRect();

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform3f(uniforms.resolution, canvas.width, canvas.height, 1.0);
      gl.uniform1f(uniforms.time, currentTime);
      gl.uniform1f(uniforms.turbulence, turbulence);
      gl.uniform1f(uniforms.speed, speed);
      gl.uniform4f(uniforms.glassRect, rect.x, rect.y, rect.width, rect.height);
      gl.uniform1f(uniforms.cornerRadius, cornerRadius);
      gl.uniform1f(uniforms.edgeSoftness, edgeSoftness);

      if (textureReady) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(uniforms.texture, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      animationFrame = requestAnimationFrame(render);
    };
    render();

    return () => {
      destroyed = true;
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    canvasRef,
    imageSrc,
    turbulence,
    speed,
    glassRect.x,
    glassRect.y,
    glassRect.width,
    glassRect.height,
    glassTargetRef,
    cornerRadius,
    edgeSoftness,
  ]);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface LiquidGlassBackgroundProps {
  imageSrc: string;
  turbulence?: number;
  speed?: number;
  /**
   * Fixed region the ripple effect is confined to, as fractions of the
   * canvas (0–1, top-left origin). Ignored if glassTargetRef is given.
   * Default: a rect inset 5% from each edge.
   */
  glassRect?: GlassRect;
  /**
   * Ref to a DOM element (e.g. your card list) whose on-screen bounding box
   * defines the glass region every frame. Use this instead of glassRect
   * when you want the effect to track a specific piece of your layout.
   */
  glassTargetRef?: RefObject<HTMLElement | null>;
  /** Corner radius of the glass region, in pixels. */
  cornerRadius?: number;
  /** Softness of the glass region's edge, in pixels. */
  edgeSoftness?: number;
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;        // goes on the outer wrapper — use this for sizing (width/height/margin) via CSS
  contentClassName?: string; // goes on the inner content wrapper — use this for anything about the layout of your children
}

/**
 * Full-bleed liquid-glass WebGL background with children rendered on top.
 * The ripple effect only happens inside a fixed rectangular region (see
 * glassRect / glassTargetRef) — it does not track the mouse, and everything
 * outside that region renders the plain, undistorted image.
 *
 * // Fixed region:
 * <LiquidGlassBackground imageSrc="/bg.jpg" glassRect={{ x: 0.1, y: 0.1, width: 0.8, height: 0.8 }}>
 *   <YourCard />
 * </LiquidGlassBackground>
 *
 * // Region tracks a specific element:
 * const listRef = useRef<HTMLUListElement>(null);
 * <LiquidGlassBackground imageSrc="/bg.jpg" glassTargetRef={listRef}>
 *   <ul ref={listRef}>...</ul>
 * </LiquidGlassBackground>
 */
export default function LiquidGlassBackground({
  imageSrc,
  turbulence = 0.02,
  speed = 0.15,
  glassRect,
  glassTargetRef,
  cornerRadius = 30,
  edgeSoftness = 24,
  children,
  style,
  className,
  contentClassName,
}: LiquidGlassBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useLiquidGlass(canvasRef, imageSrc, {
    turbulence,
    speed,
    glassRect,
    glassTargetRef,
    cornerRadius,
    edgeSoftness,
  });

  return (
    <div
      className={className}
      style={{ position: "relative", width: "100%", height: "100%", ...style }}
    >
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
      />
      <div
        className={contentClassName}
        style={{ position: "relative", zIndex: 1, width: "100%", height: "100%" }}
      >
        {children}
      </div>
    </div>
  );
}
