import { v3 } from "cc";
import { Vec3 } from "cc";
import { MathX } from "./MathX";

export class Bezier {
    private pts: Vec3[] = null;	// Points
    private len: number = 0;	// Length
    private ptl: number[] = null;	// Pascal Triangle Line
    private bez: Function = null;	// Bezier

    /**
     * 貝茲曲線計算工具
     * @param points 控制點
     */
    constructor(points: Vec3[]) {
        this.len = points.length;

        if (this.len == 0) {
            points.push(v3(0, 0));
            points.push(v3(0, 0));
        } else if (this.len == 1) {
            points.push(v3(points[0].x, points[0].y));
        }

        this.pts = points;

        switch (this.len) {
            case 2: { this.bez = this.Bezier2; break; }
            case 3: { this.bez = this.Bezier3; break; }
            case 4: { this.bez = this.Bezier4; break; }
            case 5: { this.bez = this.Bezier5; break; }
            case 6: { this.bez = this.Bezier6; break; }
            default: {
                this.ptl = MathX.PascalTriangleLine(this.len);
                this.bez = this.BezierN;
                break;
            }
        }
    }

    /**
     * 取得於指定時間尺度的位置
     * @param time `[0, 1]`
     */
    public GetPosition(time: number): Vec3 {
        return this.bez.apply(this, [time]);
    }

    /** 2 階貝茲曲線 */
    private Bezier2(t: number): Vec3 {
        let r = 1 - t;
        return v3(
            r * this.pts[0].x + t * this.pts[1].x,
            r * this.pts[0].y + t * this.pts[1].y
        );
    }

    /** 3 階貝茲曲線 */
    private Bezier3(t: number): Vec3 {
        let r = 1 - t;
        let f = [r * r, 2 * r * t, t * t];
        return v3(
            f[0] * this.pts[0].x + f[1] * this.pts[1].x + f[2] * this.pts[2].x,
            f[0] * this.pts[0].y + f[1] * this.pts[1].y + f[2] * this.pts[2].y
        );
    }

    /** 4 階貝茲曲線 */
    private Bezier4(t: number): Vec3 {
        let r = 1 - t;
        let f = [r * r * r, 3 * r * r * t, 3 * r * t * t, t * t * t];
        return v3(
            f[0] * this.pts[0].x + f[1] * this.pts[1].x + f[2] * this.pts[2].x + f[3] * this.pts[3].x,
            f[0] * this.pts[0].y + f[1] * this.pts[1].y + f[2] * this.pts[2].y + f[3] * this.pts[3].y
        );
    }

    /** 5 階貝茲曲線 */
    private Bezier5(t: number): Vec3 {
        let r = 1 - t;
        let f = [r * r * r * r, 4 * r * r * r * t, 6 * r * r * t * t, 4 * r * t * t * t, t * t * t * t];
        return v3(
            f[0] * this.pts[0].x + f[1] * this.pts[1].x + f[2] * this.pts[2].x + f[3] * this.pts[3].x + f[4] * this.pts[4].x,
            f[0] * this.pts[0].y + f[1] * this.pts[1].y + f[2] * this.pts[2].y + f[3] * this.pts[3].y + f[4] * this.pts[4].y
        );
    }

    /** 6 階貝茲曲線 */
    private Bezier6(t: number): Vec3 {
        let r = 1 - t;
        let f = [r * r * r * r * r, 5 * r * r * r * r * t, 10 * r * r * r * t * t, 10 * r * r * t * t * t, 5 * r * t * t * t * t, t * t * t * t * t];
        return v3(
            f[0] * this.pts[0].x + f[1] * this.pts[1].x + f[2] * this.pts[2].x + f[3] * this.pts[3].x + f[4] * this.pts[4].x + f[5] * this.pts[5].x,
            f[0] * this.pts[0].y + f[1] * this.pts[1].y + f[2] * this.pts[2].y + f[3] * this.pts[3].y + f[4] * this.pts[4].y + f[5] * this.pts[5].y
        );
    }

    /** N 階貝茲曲線 */
    private BezierN(t: number): Vec3 {
        let r = 1 - t;
        let v = v3(0, 0);
        for (let i = 0; i < this.len; i++) {
            let f = 1;
            for (let j = 0; j < this.len - i - 1; j++) {
                f *= r;
            }
            for (let k = 0; k < i; k++) {
                f *= t;
            }
            v.x += f * this.ptl[i] * this.pts[i].x;
            v.y += f * this.ptl[i] * this.pts[i].y;
        }
        return v;
    }
}