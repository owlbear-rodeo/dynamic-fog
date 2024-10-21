import { Math2, Vector2 } from "@owlbear-rodeo/sdk";
import { Path as SkPath } from "canvaskit-wasm";

export class CardinalSpline {
  static addToSkPath(
    skPath: SkPath,
    p: Vector2[],
    tension = 0.5,
    closed = true
  ) {
    if (p.length === 0) {
      return;
    }

    skPath.moveTo(p[0].x, p[0].y);

    if (tension !== 0 && p.length > 2) {
      const tensionPoints = this.getTensionPoints(p, tension, closed);
      const tensionLength = tensionPoints.length;

      if (!closed && tensionLength > 1) {
        skPath.quadTo(
          tensionPoints[0].x,
          tensionPoints[0].y,
          tensionPoints[1].x,
          tensionPoints[1].y
        );
      }

      for (let n = closed ? 0 : 2; n < tensionLength - 1; n += 3) {
        const cp1 = tensionPoints[n];
        const cp2 = tensionPoints[n + 1];
        const p = tensionPoints[n + 2];
        this.bezierCurveTo(skPath, cp1.x, cp1.y, cp2.x, cp2.y, p.x, p.y);
      }

      if (!closed && tensionLength > 0) {
        skPath.quadTo(
          tensionPoints[tensionLength - 1].x,
          tensionPoints[tensionLength - 1].y,
          p[p.length - 1].x,
          p[p.length - 1].y
        );
      }
    } else {
      // no tension
      for (let n = 1; n < p.length; n++) {
        skPath.lineTo(p[n].x, p[n].y);
      }
    }

    if (closed) {
      skPath.close();
    }
  }

  private static allAreFinite(args: number[]) {
    for (var i = 0; i < args.length; i++) {
      if (args[i] !== undefined && !Number.isFinite(args[i])) {
        return false;
      }
    }
    return true;
  }

  private static bezierCurveTo(
    path: SkPath,
    cp1x: number,
    cp1y: number,
    cp2x: number,
    cp2y: number,
    x: number,
    y: number
  ) {
    if (!this.allAreFinite([cp1x, cp1y, cp2x, cp2y, x, y])) {
      return;
    }
    if (path.isEmpty()) {
      path.moveTo(cp1x, cp1y);
    }
    path.cubicTo(cp1x, cp1y, cp2x, cp2y, x, y);
  }

  static getTensionPoints(points: Vector2[], tension: number, closed: boolean) {
    if (closed) {
      return this.getTensionPointsClosed(points, tension);
    } else {
      return this.expandPoints(points, tension);
    }
  }

  static getTensionPointsClosed(p: Vector2[], tension: number) {
    const len = p.length;
    const firstControlPoints = this.getControlPoints(
      p[len - 1],
      p[0],
      p[1],
      tension
    );
    const lastControlPoints = this.getControlPoints(
      p[len - 2],
      p[len - 1],
      p[0],
      tension
    );
    const middle = this.expandPoints(p, tension);
    const tp = [firstControlPoints[1]]
      .concat(middle)
      .concat([
        lastControlPoints[0],
        p[len - 1],
        lastControlPoints[1],
        firstControlPoints[0],
        p[0],
      ]);

    return tp;
  }

  static expandPoints(p: Vector2[], tension: number) {
    const allPoints: Vector2[] = [];

    for (let n = 1; n < p.length - 1; n++) {
      const [cp1, cp2] = this.getControlPoints(
        p[n - 1],
        p[n],
        p[n + 1],
        tension
      );
      if (isNaN(cp1.x)) {
        continue;
      }
      allPoints.push(cp1, p[n], cp2);
    }

    return allPoints;
  }

  static getControlPoints(
    p0: Vector2,
    p1: Vector2,
    p2: Vector2,
    t: number
  ): [Vector2, Vector2] {
    const d01 = Math2.distance(p0, p1);
    const d12 = Math2.distance(p1, p2);

    const d = d01 + d12;
    if (d <= 0) {
      return [{ ...p0 }, { ...p0 }];
    }

    const fa = (t * d01) / d;
    const fb = (t * d12) / d;

    const p02 = Math2.subtract(p2, p0);

    const cp1 = Math2.subtract(p1, Math2.multiply(p02, fa));
    const cp2 = Math2.add(p1, Math2.multiply(p02, fb));

    return [cp1, cp2];
  }
}
