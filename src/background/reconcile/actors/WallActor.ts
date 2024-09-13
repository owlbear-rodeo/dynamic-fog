import { buildWall, isWall, Item, Vector2, Wall } from "@owlbear-rodeo/sdk";
import { Actor } from "../Actor";
import { Reconciler } from "../Reconciler";
import { Drawing, isDrawing } from "../../../types/Drawing";
import { WallHelpers } from "../../util/WallHelpers";
import { DoorReactor } from "../reactors/DoorReactor";

export class WallActor extends Actor {
  private walls: Wall[] = [];
  private door: DoorReactor;
  constructor(reconciler: Reconciler, parent: Item) {
    super(reconciler);
    const door = reconciler.find(DoorReactor);
    if (!door) {
      throw Error("Unable to create WallReactor: DoorReactor must exist");
    }
    this.door = door;
    if (isDrawing(parent)) {
      this.walls = this.drawingToWalls(parent);
      this.reconciler.patcher.addItems(...this.walls);
    }
  }

  delete(): void {
    this.reconciler.patcher.deleteItems(...this.walls.map((wall) => wall.id));
  }

  update(parent: Item) {
    if (!isDrawing(parent)) {
      return;
    }
    const prev = this.walls;
    const next = WallHelpers.drawingToContours(
      parent,
      this.reconciler.CanvasKit,
      this.door.getDoors()
    );
    if (prev.length < next.length) {
      // Need to add more walls as there are new contours
      for (let i = prev.length; i < next.length; i++) {
        const contour = next[i];
        const wall = this.contourToWall(parent, contour);
        prev.push(wall);
        this.reconciler.patcher.addItems(wall);
      }
    } else if (prev.length > next.length) {
      // Need to remove walls as there are less contours
      const numRemoved = prev.length - next.length;
      const toDelete = prev.splice(prev.length - numRemoved, numRemoved);
      this.reconciler.patcher.deleteItems(...toDelete.map((wall) => wall.id));
    }
    // Update remaining walls
    for (let i = 0; i < prev.length; i++) {
      const wall = prev[i];
      const contour = next[i];
      prev[i] = {
        ...wall,
        points: contour,
      };
      this.reconciler.patcher.updateItems([
        wall.id,
        (item) => {
          if (isWall(item)) {
            item.points = contour;
          }
        },
      ]);
    }
  }

  private drawingToWalls(drawing: Drawing): Wall[] {
    const doors = this.door.getDoors();
    const walls: Wall[] = [];
    const contours = WallHelpers.drawingToContours(
      drawing,
      this.reconciler.CanvasKit,
      doors
    );
    for (const contour of contours) {
      walls.push(this.contourToWall(drawing, contour));
    }
    return walls;
  }

  private contourToWall(drawing: Drawing, contour: Vector2[]): Wall {
    const wall = buildWall()
      .points(contour)
      .attachedTo(drawing.id)
      .position(drawing.position)
      .rotation(drawing.rotation)
      .scale(drawing.scale)
      .build();
    return wall;
  }
}
