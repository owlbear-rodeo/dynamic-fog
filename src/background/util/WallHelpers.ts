import { CanvasKit, Path as SkPath } from "canvaskit-wasm";
import { Drawing } from "../drawing";
import { PathHelpers } from "./PathHelpers";
import { Command, isShape, PathCommand, Vector2 } from "@owlbear-rodeo/sdk";

export class WallHelpers {
  /**
   * Convert a drawing into an array of contours
   * Each contour is an array of points that represent a single continuous curve
   * You may have multiple contours if the input is a Path item with multiple inside shapes
   * For straight lines the points will be converted exactly to the output
   * For curved surfaces the curves will be sampled by `sampleDistance`
   */
  static drawingToContours(
    drawing: Drawing,
    CanvasKit: CanvasKit,
    doors: SkPath[],
    sampleDistance = 10
  ): Vector2[][] {
    const skPath = PathHelpers.drawingToSkPath(drawing, CanvasKit);
    skPath?.stroke({
      cap: isShape(drawing)
        ? CanvasKit.StrokeCap.Square
        : CanvasKit.StrokeCap.Round,
      join: isShape(drawing)
        ? CanvasKit.StrokeJoin.Miter
        : CanvasKit.StrokeJoin.Round,
      // TODO: Use grid stroke width instead
      // TODO: Check with zero width
      width: drawing.style.strokeWidth,
    });

    for (const door of doors) {
      skPath?.op(door, CanvasKit.PathOp.Difference);
    }

    const commands = skPath && PathHelpers.skPathToPathCommands(skPath);
    skPath?.delete();

    if (!commands) {
      return [];
    }

    const contours: Vector2[][] = [];
    // The points for this contour
    let points: Vector2[] = [];
    // The index into the commands array that this contour starts
    let contourStartIndex = 0;
    for (let index = 0; index < commands.length; index++) {
      const command = commands[index];
      const verb = command[0];

      const prevIndex = Math.max(index - 1, contourStartIndex);
      const prevCommand = commands[prevIndex];
      const startCommand = commands[contourStartIndex];

      switch (verb) {
        case Command.MOVE:
        case Command.LINE:
          // Add the point directly
          points.push(PathHelpers.getCommandPoint(command));
          break;
        case Command.QUAD:
        case Command.CONIC:
        case Command.CUBIC:
          if (prevCommand) {
            // Sample from the previous command to this command
            const prevAnchorPoint = PathHelpers.getCommandPoint(prevCommand);
            const subCommands: PathCommand[] = [
              [Command.MOVE, prevAnchorPoint.x, prevAnchorPoint.y],
              [...command],
            ];
            const samples = PathHelpers.samplePathCommands(
              CanvasKit,
              subCommands,
              sampleDistance
            );
            points.push(...samples);
          }
          break;
        case Command.CLOSE:
          // Add a point back to the start and start a new contour
          if (startCommand) {
            points.push(PathHelpers.getCommandPoint(startCommand));
          }
          contours.push(points);
          points = [];
          contourStartIndex = index + 1;
          break;
      }
    }

    if (points.length > 0) {
      // The contour didn't finish with a close command so use the remaining points
      contours.push(points);
    }

    return contours;
  }
}
