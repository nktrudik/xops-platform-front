import { fragmentShader, vertexShader } from './shaders'

export interface RibbonRenderer {
  resize(width: number, height: number, pixelRatio: number): void
  draw(time: number, x: number, y: number, engaged: number): void
  dispose(releaseContext?: boolean): void
}

/** A fixed mesh is deformed on the GPU; no per-frame geometry or DOM measurements. */
export function createRibbonRenderer(canvas: HTMLCanvasElement): RibbonRenderer | null {
  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: true,
    premultipliedAlpha: false,
    powerPreference: 'low-power',
  })
  if (!gl) return null
  const shaders: WebGLShader[] = []
  const buffers: WebGLBuffer[] = []
  const program = gl.createProgram()
  function dispose(releaseContext = false): void {
    for (const buffer of buffers) gl!.deleteBuffer(buffer)
    for (const shader of shaders) gl!.deleteShader(shader)
    gl!.deleteProgram(program)
    if (releaseContext) gl!.getExtension('WEBGL_lose_context')?.loseContext()
  }
  if (!program) return null
  for (const [type, source] of [
    [gl.VERTEX_SHADER, vertexShader],
    [gl.FRAGMENT_SHADER, fragmentShader],
  ] as const) {
    const shader = gl.createShader(type)
    if (!shader) {
      dispose()
      return null
    }
    shaders.push(shader)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      dispose()
      return null
    }
    gl.attachShader(program, shader)
  }
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    dispose()
    return null
  }
  const segments = 192
  const sides = 24
  const vertices = new Float32Array((segments + 1) * (sides + 1) * 2)
  const indices = new Uint16Array(segments * sides * 6)
  let index = 0
  for (let i = 0; i <= segments; i++) {
    for (let j = 0; j <= sides; j++) {
      vertices[index++] = (i / segments) * Math.PI * 2
      vertices[index++] = (j / sides) * Math.PI * 2
    }
  }
  index = 0
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < sides; j++) {
      const a = i * (sides + 1) + j
      for (const vertex of [a, a + sides + 1, a + 1, a + 1, a + sides + 1, a + sides + 2])
        indices[index++] = vertex
    }
  }
  const vertexBuffer = gl.createBuffer()
  const indexBuffer = gl.createBuffer()
  if (!vertexBuffer || !indexBuffer) {
    if (vertexBuffer) gl.deleteBuffer(vertexBuffer)
    if (indexBuffer) gl.deleteBuffer(indexBuffer)
    dispose()
    return null
  }
  buffers.push(vertexBuffer, indexBuffer)
  gl.useProgram(program)
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW)
  const attribute = gl.getAttribLocation(program, 'a_uv')
  gl.enableVertexAttribArray(attribute)
  gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0)
  const time = gl.getUniformLocation(program, 'u_time')
  const aspect = gl.getUniformLocation(program, 'u_aspect')
  const pointer = gl.getUniformLocation(program, 'u_pointer')
  const engaged = gl.getUniformLocation(program, 'u_engaged')
  gl.enable(gl.DEPTH_TEST)
  gl.clearColor(0, 0, 0, 0)
  return {
    resize(width, height, pixelRatio) {
      canvas.width = Math.max(1, Math.round(width * pixelRatio))
      canvas.height = Math.max(1, Math.round(height * pixelRatio))
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.uniform1f(aspect, width / Math.max(height, 1))
    },
    draw(seconds, x, y, active) {
      gl.uniform1f(time, seconds)
      gl.uniform2f(pointer, x, y)
      gl.uniform1f(engaged, active)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
      gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0)
    },
    dispose,
  }
}
