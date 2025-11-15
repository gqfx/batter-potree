/**
 * Type declarations for .glsl shader files
 */

declare module '*.glsl' {
  const content: string;
  export default content;
}

declare module '*.vert.glsl' {
  const content: string;
  export default content;
}

declare module '*.frag.glsl' {
  const content: string;
  export default content;
}

declare module '*?raw' {
  const content: string;
  export default content;
}
