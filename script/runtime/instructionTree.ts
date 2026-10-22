import type { RenderInstruction } from './interpreter';

/** All document instructions, including controls on currently unmounted screens. */
export function* walkRenderInstructions(
  instructions: readonly RenderInstruction[]
): Generator<RenderInstruction> {
  for (const instruction of instructions) {
    yield instruction;
    if (instruction.children) yield* walkRenderInstructions(instruction.children);
  }
}
