import { Node, isValid, tween, Tween, Vec3 } from "cc"

//================================================================================================
/**
 * 旋轉補間動畫
 */
//================================================================================================

export namespace TweenRotation {

    /** 開始旋轉過渡動畫 */
    export function StartToRotation(target: Node, targetRotation: Vec3, duration: number): void {
        if (!isValid(target)) {
            return
        }

        tween(target)
            .to(duration, { eulerAngles: targetRotation })
            .start()
    }

    /** 開始旋轉過渡動畫（使用 x, y, z 角度） */
    export function StartToRotationXYZ(target: Node, x: number, y: number, z: number, duration: number): void {
        if (!isValid(target)) {
            return
        }

        const targetRotation = new Vec3(x, y, z)

        tween(target)
            .to(duration, { eulerAngles: targetRotation })
            .start()
    }

    /** 旋轉偏移量 */
    export function RotateBy(target: Node, offset: Vec3, duration: number): void {
        if (!isValid(target)) {
            return
        }

        const targetRotation = target.eulerAngles.add(offset)

        tween(target)
            .to(duration, { eulerAngles: targetRotation })
            .start()
    }

    /** 旋轉偏移量（使用 x, y, z 角度） */
    export function RotateByXYZ(target: Node, x: number, y: number, z: number, duration: number): void {
        if (!isValid(target)) {
            return
        }

        const offset = new Vec3(x, y, z)
        RotateBy(target, offset, duration)
    }

    /** 停止旋轉動畫 */
    export function StopRotation(target: Node): void {
        if (!isValid(target)) {
            return
        }

        Tween.stopAllByTarget(target)
    }

    /** 設置旋轉（不使用動畫） */
    export function SetRotation(target: Node, rotation: Vec3): void {
        if (!isValid(target)) {
            return
        }

        target.eulerAngles = rotation
    }

    /** 設置旋轉（使用 x, y, z 角度，不使用動畫） */
    export function SetRotationXYZ(target: Node, x: number, y: number, z: number): void {
        if (!isValid(target)) {
            return
        }

        target.eulerAngles = new Vec3(x, y, z)
    }

    /** 連續旋轉動畫 */
    export function SpinContinuously(target: Node, rotationSpeed: Vec3): void {
        if (!isValid(target)) {
            return
        }

        const spin = () => {
            tween(target)
                .by(1, { eulerAngles: rotationSpeed })
                .call(spin)
                .start()
        }

        spin()
    }

    /** Z 軸連續旋轉動畫 */
    export function SpinZ(target: Node, speed: number): void {
        if (!isValid(target)) {
            return
        }

        SpinContinuously(target, new Vec3(0, 0, speed))
    }

    /** 擺動動畫 */
    export function Swing(target: Node, angle: number, duration: number): void {
        if (!isValid(target)) {
            return
        }

        const originalRotation = target.eulerAngles
        const swingRotation = originalRotation.add(new Vec3(0, 0, angle))

        tween(target)
            .to(duration * 0.5, { eulerAngles: swingRotation })
            .to(duration * 0.5, { eulerAngles: originalRotation })
            .start()
    }
}
