import { _decorator, Camera, log, Node, Vec3, sys, Tween, tween, Label, v2, v3, geometry, Mat4, UITransform, PhysicsSystem } from 'cc'

const tmp_v3 = v3()
const tmp_ray = new geometry.Ray()
const tmp_mat4 = new Mat4()
const { ccclass } = _decorator

@ccclass('Helper')
export default class FishCommHelper{

    static radiansToDegrees(radians: number): number {
        return radians * 57.29577951 // PI * 180
    }

    static degreesToRadians(radians: number): number {
        return radians * 0.01745329252 // PI / 180
    }

    static createSpriteAnimation(frameCount: number, frameNameFunc: Function, frameDelay: number): any {

    }

    static createSpriteWithAnimation(frameCount: number, frameNameFunc: Function, frameDelay: number): any {

    }

    static USE_DOT: string = "."
    static USE_THOUSANDTHS: string = ","

    static FORMAT_NUMBER_TYPE = {
        /**完全不需要顯示小數點*/
        NONE_DOT: 0,
        /**看設定是否要顯示小數點*/
        DEFINE_DOT: 1,
        /**常駐小數點*/
        PERMANENT_DOT: 2,
        /**小數點為0不顯示，有的話就顯示*/
        DEFINE_DOT_NONE_ZERO: 3,
        /**顯示所有位數*/
        ALL_DIGITS: 4,
    }
    /**
     * 格式化顯示的數字
     * @param num 要轉字串的數值
     * @param type 字串的格式
     * @param isThousands 是否增加千分位，預設要加
     * @param digits 小數點要顯示到第幾位
     */
    static FormatNumberThousands(num: number, type: number = this.FORMAT_NUMBER_TYPE.NONE_DOT, isThousands: boolean = true, digits: number = 0): string {
        let intFormat = function (subStr: string): string {
            if (subStr != undefined && Number(subStr) >= 1000 && isThousands) {
                let pattern = /(-?\d+)(\d{3})/
                while (pattern.test(subStr)) {
                    subStr = subStr.replace(pattern, "$1" + this.USE_THOUSANDTHS + "$2")
                }
            }
            return subStr
        }

        let sign: string = (num < 0) ? "-" : ""
        let str: string = (Math.abs(num)).toString()
        let arr: string[] = str.split(".")
        switch (type) {
            case this.FORMAT_NUMBER_TYPE.PERMANENT_DOT: {
                arr[0] = intFormat(arr[0])
                if (arr[1] == undefined) {
                    arr[1] = "0"
                }
                arr[1] = arr[1] + "00"
                str = arr[0] + this.USE_DOT + arr[1].substr(0, digits)
                break
            }
            case this.FORMAT_NUMBER_TYPE.DEFINE_DOT_NONE_ZERO: {
                arr[0] = intFormat(arr[0])
                if (arr[1] == undefined) {
                    str = arr[0]
                } else {
                    str = arr[0] + this.USE_DOT + arr[1].substr(0, digits)
                }
                break
            }
            case this.FORMAT_NUMBER_TYPE.ALL_DIGITS: {
                break
            }
            case this.FORMAT_NUMBER_TYPE.NONE_DOT:
            default: {
                str = intFormat(Math.floor(Number(str)).toString())
                break
            }
        }

        return (sign + str)
    }

    public FormatCurrency(number: number, isK?: boolean): string {
        // if (isK && Dinosaur.Play.isCrystalTheme && number > 999999) {
        //鑽石館的判斷要補上
        if (isK  && number > 999999) {
            return FishCommHelper.FormatNumberThousands(Math.floor(number / 1000)) + "K"
        } else {
            return FishCommHelper.FormatNumberThousands(number)
        }
    }

    // public createLabelCounter(...args: any[]): LabelCounter {
    //     return LabelCounter.create(...args)
    // }

    public rayIntersects3d(ray: any, sprite3d: any): boolean {
        // const obb = cc.OBB.new(sprite3d.getAABB())
        // return ray.intersects(obb)
        return false
    }

    //這裡可能不合，再看看
    public CreateFishIdxData(groupIndex: number, fishIdx: number): any {
        // const data = DEG_FishIdxData.create()
        // data.groupIndex = groupIndex
        // data.fishIdx = fishIdx
        // return data
    }

    //這裡可能不合，再看看
    public CreateFishIdxDataByTable(data_: any): any {
        // if (!data_ || !data_.groupIndex || !data_.fishIdx) {
        //     return null
        // }
        // const data = DEG_FishIdxData.create()
        // data.groupIndex = data_.groupIndex
        // data.fishIdx = data_.fishIdx
        // return data
    }


    public IsForeverDateTime(timeString: string): boolean {
        // 判斷是否為永久時間
        if (timeString === null) {
            console.log("[Dinosaur.Helper] - IsForeverDateTime timeString is nil!")
            return false
        }

        if (timeString === '1900-01-01 00:00:00') {
            return true
        }

        return false
    }

    // 轉換時間字串為os.time
    public GetDateTimeFromString(dateString: string): number {
        // 2017-01-01 00:00:00
        const match = dateString.match(/(\d+)-(\d+)-(\d+) (\d+):(\d+):(\d+)/)
        if (match) {
            const Y = match[1]
            const M = match[2]
            const D = match[3]
            const H = match[4]
            const MM = match[5]
            const SS = match[6]
            return Date.UTC(parseInt(Y), parseInt(M) - 1, parseInt(D), parseInt(H), parseInt(MM), parseInt(SS)) / 1000
        }
        return 0
    }

    // 檢查時間是否過期
    public IsExpiredTime(time: any): boolean {
        // 時間本身為空，最可能是剛開始沒給時間，通常是測試使用
        if (time === null) {
            return false
        }
        if (this.IsForeverDateTime(time)) {
            return false
        }
        if (typeof time === "string") {
            time = this.GetDateTimeFromString(time)
        }

        if (time === null) {
            log("[Dinosaur.Helper] IsExpiredTime decode failed!")
            return false
        }

        //這裡要等平台給
        // const nowTime = Gt2UserApp.GetServerTime()    // 現在時間
        const nowTime = sys.now()
        const diffTime = nowTime - time   // 傳進來的時間相比, < 0 : 尚未過期 , > 0 : 已經過期

        return diffTime > 0
    }

    // 轉換時間字串成秒數
    // 時間格式:yyyy-mm-dd hh:mm:ss
    public TimeStringConvertedTimestamp(timeString: string): number {
        if (timeString === null) { return 0 }
        const match = timeString.match(/(\d+)-(\d+)-(\d+) (\d+):(\d+):(\d+)/)
        if (!match) { return 0 }

        const runyear = match[1]
        const runmonth = match[2]
        const runday = match[3]
        const runhour = match[4]
        const runminute = match[5]
        const runseconds = match[6]

        // 因為Server預設時間是可能小於1970年，特別判定
        if (parseInt(runyear) < 1970) { return 0 }

        const convertedTimestamp = Date.UTC(parseInt(runyear), parseInt(runmonth) - 1, parseInt(runday), parseInt(runhour), parseInt(runminute), parseInt(runseconds)) / 1000 || 0
        return convertedTimestamp
    }

    public GetBoneByName(model: any, name: string): any {
        // if (cc.Bone3D) {
        //     const skeleton = model.getSkeleton()

        //     const cnt = skeleton.getBoneCount()

        //     for (let i = 1 i <= cnt i++) {
        //         const bone = skeleton.getBoneByIndex(i - 1)
        //         if (bone && bone.getName() === name) {
        //             return bone
        //         }
        //     }
        // }

        // return null
    }

    public PrintAllChild(node: Node, level: number): void {
        let str = ""
        for (let i = 1; i <= level; i++) {
            str = str + "  "
        }
        str = str + '"' + node.name + '"'

        const childs = node.children
        log(str, childs.length)
        for (let i = 0; i < childs.length; i++) {
            this.PrintAllChild(childs[i], level + 1)
        }
    }
    //應該有新做法
    public PrintAllBone(skeleton: any): void {
        // if (cc.Bone3D && skeleton) {
        //     const n = skeleton.getRootCount()
        //     for (let i = 1 i <= n i++) {
        //         const b = skeleton.getRootBone(i - 1)
        //         PrintAllBoneR(b, 0)
        //     }
        // }
    }

    public PrintAllMesh(sprite3d: any, printTexture?: boolean): void {
        const n = sprite3d.getMeshCount()
        for (let i = 1; i <= n; i++) {
            const mesh = sprite3d.getMeshByIndex(i - 1)
            log("", mesh.getName())
        }
    }

    public PrintSprite3DStates(model: any, path: string): void {
        log("PrintSprite3DStates", path)
        const sk = model.getSkeleton()

        log("NodeName:")
        this.PrintAllChild(model, 0)

        log("BoneName:")
        this.PrintAllBone(sk)

        log("MeshName:")
        this.PrintAllMesh(model)
    }
    //作法須研究
    public ChangeToGray(node: Node): void {
        // const glProgram = CreateCustomShader("Dinosaur_Gray_GLProgram", Dinosaur.LuaPath.Shader + "normal.vert",
        // Dinosaur.LuaPath.Shader + "gray.frag")
        // if (glProgram) {
        //     node.setGLProgram(glProgram)
        // }
    }
    //作法須研究
    public BackToOrigin(node: Node): void {
        // node.setGLProgram(cc.GLProgramCache.getInstance().getGLProgram(SHADER_POSITION_TEXTURE_COLOR_NO_MVP))
    }

    public setMeshIsTransparent(meshObj: any, flag: boolean): void {
        if (meshObj && meshObj.setIsTransparent) {
            meshObj.setIsTransparent(flag)
        }
    }

     //作法須研究
    public ConvertToWorldSpace3d(node: Node, nodeVec3?: Vec3): Vec3 {
        // const wmat = node.getNodeToWorldTransform()
        // if (nodeVec3 === null) {
        //     return cc.vec3(wmat[13], wmat[14], wmat[15])
        // }
        // // cc.mat4.translate 是錯誤的不可用(3.10)
        // const res = cc.vec3(
        //     wmat[1] * nodeVec3.x + wmat[5] * nodeVec3.y + wmat[9] * nodeVec3.z + wmat[13],
        //     wmat[2] * nodeVec3.x + wmat[6] * nodeVec3.y + wmat[10] * nodeVec3.z + wmat[14],
        //     wmat[3] * nodeVec3.x + wmat[7] * nodeVec3.y + wmat[11] * nodeVec3.z + wmat[15]
        // )
        // return res
        return Vec3.ZERO
    }
    //作法須研究
    public convertToWorldSpace3dVec(node: Node, nodeVec3: Vec3): Vec3 {
        // const wmat = node.getNodeToWorldTransform()
        // // cc.mat4.translate 是錯誤的不可用(3.10)
        // const res = cc.vec3(
        //     wmat[1] * nodeVec3.x + wmat[5] * nodeVec3.y + wmat[9] * nodeVec3.z,
        //     wmat[2] * nodeVec3.x + wmat[6] * nodeVec3.y + wmat[10] * nodeVec3.z,
        //     wmat[3] * nodeVec3.x + wmat[7] * nodeVec3.y + wmat[11] * nodeVec3.z
        // )
        // const len = Math.sqrt(res.x * res.x + res.y * res.y + res.z * res.z)
        // res.x = res.x / len
        // res.y = res.y / len
        // res.z = res.z / len
        // return res
        return Vec3.ZERO
    }
    //作法須研究
    public SetMeshProperties(sprite3dObj: any, meshDatas: any, seat?: number): void {
        // if (sprite3dObj === null || meshDatas === null) { return }

        // for (const [index, meshData] of Object.entries(meshDatas)) {
        //     const mesh = sprite3dObj.getMeshByIndex(index)
        //     if (mesh) {
        //         if (mesh.setTexture) {
        //             if (meshData.Texture) {
        //                 mesh.setTexture(meshData.Texture)
        //             }
        //             if (seat && meshData.SeatTextureSet && meshData.SeatTextureSet[seat]) {
        //                 mesh.setTexture(meshData.SeatTextureSet[seat])
        //             }
        //         }
        //         if (meshData.Additive) {
        //             mesh.setBlendFunc({ src: gl.SRC_ALPHA, dst: gl.ONE })
        //         }
        //         if (meshData.Material) {
        //             mesh.setMaterial(cc.Material.createWithFilename(meshData.Material))
        //         }
        //         mesh.setVisible(!meshData.inVisible)
        //     }
        // }
    }
    //作法須研究
    public crossVec3(v1: Vec3, v2: Vec3): Vec3 {
        // return cc.vec3(
        //     v1.y * v2.z - v1.z * v2.y,
        //     v1.z * v2.x - v1.x * v2.z,
        //     v1.x * v2.y - v1.y * v2.x
        // )
        return Vec3.ZERO
    }
    //作法須研究
    public directionToQuat(front: Vec3, up?: Vec3): any {
        // if (up === null) {
        //     up = cc.vec3(0, 1, 0)
        // } else {
        //     up = cc.vec3normalize(up)
        // }
        // const right = cc.vec3normalize(this.crossVec3(front, up))
        // up = cc.vec3normalize(this.crossVec3(right, front))
        // // mat3 = {right.x, right.y, right.z, front.x, front.y, front.z, up.x, up.y, up.z}

        // const trace = right.x + front.y + up.z
        // let s = 0
        // const out = cc.quaternion(0, 0, 0, 0)
        // if (trace > 0) {
        //     s = 0.5 / Math.sqrt(trace + 1)
        //     out.w = 0.25 / s
        //     out.x = (front.z - up.y) * s
        //     out.y = (up.x - right.z) * s
        //     out.z = (right.y - front.x) * s
        // } else if ((right.x > front.y) && (right.x > up.z)) {
        //     s = 2 * Math.sqrt(1 + right.x - front.y - up.z)
        //     out.w = (front.z - up.y) / s
        //     out.x = 0.25 * s
        //     out.y = (front.x + right.y) / s
        //     out.z = (up.x + right.z) / s
        // } else if ((front.y > up.z)) {
        //     s = 2 * Math.sqrt(1 + front.y - right.x - up.z)
        //     out.w = (up.x - right.z) / s
        //     out.x = (front.x + right.y) / s
        //     out.y = 0.25 * s
        //     out.z = (up.y + front.z) / s
        // } else {
        //     s = 2.0 * Math.sqrt(1.0 + up.z - right.x - front.y)
        //     out.w = (right.y - front.x) / s
        //     out.x = (up.x + right.z) / s
        //     out.y = (up.y + front.z) / s
        //     out.z = 0.25 * s
        // }
        // return out
        return Vec3.ZERO
    }
//作法須研究
    public quatLerp(a: any, b: any, t: number): any {
        // const dot = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w
        // if (dot >= 0) {
        //     return this.quaternionNormalize(cc.quaternion(a.x + t * (b.x - a.x), a.y + t * (b.y - a.y), a.z + t * (b.z - a.z),
        //     a.w + t * (b.w - a.w)))
        // } else {
        //     return this.quaternionNormalize(cc.quaternion(a.x + t * (-b.x - a.x), a.y + t * (-b.y - a.y), a.z + t *
        //     (-b.z - a.z), a.w + t * (-b.w - a.w)))
        // }
        return Vec3.ZERO
    }
//作法須研究
    public quatMulVec(quat: any, vec: Vec3): Vec3 {
        // const qvec = cc.vec3(quat.x, quat.y, quat.z)
        // const uv = this.crossVec3(qvec, vec)
        // const uuv = this.crossVec3(qvec, uv)
        // return cc.vec3(
        //     vec.x + uv.x * 2 * quat.w + uuv.x * 2,
        //     vec.y + uv.y * 2 * quat.w + uuv.y * 2,
        //     vec.z + uv.z * 2 * quat.w + uuv.z * 2
        // )
        return Vec3.ZERO
    }
//作法須研究
    public quaternionNormalize(q1: any): any {
        // let n = q1.x * q1.x + q1.y * q1.y + q1.z * q1.z + q1.w * q1.w

        // // Already normalized.
        // if (0.999999 < n && n < 1.000001) {
        //     return q1
        // }

        // n = Math.sqrt(n)
        // // Too close to zero.
        // if (n < 0.000001) {
        //     return q1
        // }

        // n = 1.0 / n
        // const x = q1.x * n
        // const y = q1.y * n
        // const z = q1.z * n
        // const w = q1.w * n

        // return cc.quaternion(x, y, z, w)
        return Vec3.ZERO
    }

    public quaternionMultiply(q1: any, q2: any): any {
        // const A = (q1.w + q1.x) * (q2.w + q2.x)
        // const B = (q1.z - q1.y) * (q2.y - q2.z)
        // const C = (q1.w - q1.x) * (q2.y + q2.z)
        // const D = (q1.y + q1.z) * (q2.w - q2.x)
        // const E = (q1.x + q1.z) * (q2.x + q2.y)
        // const F = (q1.x - q1.z) * (q2.x - q2.y)
        // const G = (q1.w + q1.y) * (q2.w - q2.z)
        // const H = (q1.w - q1.y) * (q2.w + q2.z)
        // const w = B + (-E - F + G + H) / 2
        // const x = A - (E + F + G + H) / 2
        // const y = C + (E - F + G - H) / 2
        // const z = D + (E - F - G + H) / 2

        // return this.quaternionNormalize(cc.quaternion(x, y, z, w))
        return Vec3.ZERO
    }

    public eularAngleToQuaternion(vec3: Vec3): any {
        // const PId180d2 = 0.00872664625 // pi/180/2
        // const halfRadx = vec3.x * PId180d2
        // const halfRady = vec3.y * PId180d2
        // const halfRadz = -vec3.z * PId180d2
        // const cr = Math.cos(halfRadx)
        // const cp = Math.cos(halfRady)
        // const cy = Math.cos(halfRadz)
        // const sr = Math.sin(halfRadx)
        // const sp = Math.sin(halfRady)
        // const sy = Math.sin(halfRadz)
        // const cpcy = cp * cy
        // const spsy = sp * sy
        // const w = cr * cpcy + sr * spsy
        // const x = sr * cpcy - cr * spsy
        // const y = cr * sp * cy + sr * cp * sy
        // const z = cr * cp * sy - sr * sp * cy

        // return this.quaternionNormalize(cc.quaternion(x, y, z, w))
        return Vec3.ZERO
    }

    public quaternionSlerp(q1: any, q2: any, t: number): any {
        // if (t < 0 || t > 1) { return }
        // if (t === 0) { return cc.quaternion(q1.x, q1.y, q1.z, q1.w) }
        // if (t === 1) { return cc.quaternion(q2.x, q2.y, q2.z, q2.w) }
        // if (q1.x === q2.x && q1.y === q2.y && q1.z === q2.z && q1.w === q2.w) { return }

        // let halfY: number, alpha: number, beta: number
        // let u: number, f1: number, f2a: number, f2b: number
        // let ratio1: number, ratio2: number
        // let halfSecHalfTheta: number, versHalfTheta: number
        // let sqNotU: number, sqU: number

        // const cosTheta = q1.w * q2.w + q1.x * q2.x + q1.y * q2.y + q1.z * q2.z

        // // As usual in all slerp implementations, we fold theta.
        // alpha = cosTheta >= 0 ? 1 : -1
        // halfY = 1 + alpha * cosTheta

        // // Here we bisect the interval, so we need to fold t as well.
        // f2b = t - 0.5
        // u = f2b >= 0 ? f2b : -f2b
        // f2a = u - f2b
        // f2b = f2b + u
        // u = u + u
        // f1 = 1 - u

        // // One iteration of Newton to get 1-cos(theta / 2) to good accuracy.
        // halfSecHalfTheta = 1.09 - (0.476537 - 0.0903321 * halfY) * halfY
        // halfSecHalfTheta = halfSecHalfTheta * (1.5 - halfY * halfSecHalfTheta * halfSecHalfTheta)
        // versHalfTheta = 1 - halfY * halfSecHalfTheta

        // // Evaluate series expansions of the coefficients.
        // sqNotU = f1 * f1
        // ratio2 = 0.0000440917108 * versHalfTheta
        // ratio1 = -0.00158730159 + (sqNotU - 16) * ratio2
        // ratio1 = 0.0333333333 + ratio1 * (sqNotU - 9) * versHalfTheta
        // ratio1 = -0.333333333 + ratio1 * (sqNotU - 4) * versHalfTheta
        // ratio1 = 1 + ratio1 * (sqNotU - 1) * versHalfTheta

        // sqU = u * u
        // ratio2 = -0.00158730159 + (sqU - 16) * ratio2
        // ratio2 = 0.0333333333 + ratio2 * (sqU - 9) * versHalfTheta
        // ratio2 = -0.333333333 + ratio2 * (sqU - 4) * versHalfTheta
        // ratio2 = 1 + ratio2 * (sqU - 1) * versHalfTheta

        // // Perform the bisection and resolve the folding done earlier.
        // f1 = f1 * ratio1 * halfSecHalfTheta
        // f2a = f2a * ratio2
        // f2b = f2b * ratio2
        // alpha = alpha * (f1 + f2a)
        // beta = f1 + f2b

        // // Apply final coefficients to a and b as usual.
        // const w = alpha * q1.w + beta * q2.w
        // const x = alpha * q1.x + beta * q2.x
        // const y = alpha * q1.y + beta * q2.y
        // const z = alpha * q1.z + beta * q2.z

        // // This final adjustment to the quaternion's length corrects for
        // // any small constraint error in the inputs q1 and q2 But as you
        // // can see, it comes at the cost of 9 additional multiplication
        // // operations. If this error-correcting feature is not required,
        // // the following code may be removed.
        // f1 = 1.5 - 0.5 * (w * w + x * x + y * y + z * z)
        // return cc.quaternion(x * f1, y * f1, z * f1, w * f1)
        return Vec3.ZERO
    }

    public GetDirection(node: Node, direction: Vec3): Vec3 {
        // const rot = node.getRotation3D()
        // const rotQuat = this.eularAngleToQuaternion(rot)
        // const rotMat = cc.mat4.createRotation(rotQuat)
        // const forward = cc.mat4.transformVector(rotMat, direction)
        // return forward
        return Vec3.ZERO
    }
}

/**
 * 轉換到某個 UI 節點的座標系 (開銷較大請注意呼叫頻率)
 * ps. uiDst & uiSrc 必定要有 UITransform 元件
 * @param uiDst 轉換到的節點座標系
 * @param uiSrc 被轉換的節點
 * @param pos 被轉換的節點座標值(預設原點)
 */
export function TransUIPos(uiDst: Node | UITransform, uiSrc: Node | UITransform, pos: Vec3 = null): Vec3 {
    if (uiDst instanceof Node) uiDst = uiDst.getComponent(UITransform)
    if (uiSrc instanceof Node) uiSrc = uiSrc.getComponent(UITransform)

    let wpos = uiSrc.convertToWorldSpaceAR(pos || Vec3.ZERO)
    let goal = uiDst.convertToNodeSpaceAR(wpos)
    return goal
}

/**
 * 轉換到某個 3D 節點的座標系 (開銷較大請注意呼叫頻率)
 * @param dstNode 轉換到的節點座標系
 * @param srcNode 被轉換的節點
 * @param pos 被轉換的節點座標值 (預設原點)
 */
export function Trans3DPos(dstNode: Node, srcNode: Node, pos: Vec3 = null): Vec3 {
    let xyz = v3()
    let invMat4 = Mat4.invert(tmp_mat4, dstNode.worldMatrix)

    if (pos === null)
        xyz.set(srcNode.worldPosition)
    else
        Vec3.transformMat4(xyz, pos, srcNode.worldMatrix)

    return Vec3.transformMat4(xyz, xyz, invMat4)  // Vec3.transformMat4 的參數都唯讀的
}
/**
 * 3D 座標點轉成 2D 螢幕座標點
 * @param camera_3D 該3D節點的渲染相機
 * @param camera_2D 需要轉換到的2D層的渲染相機
 * @param worldPos_3D 欲轉換的3D座標
 * @param distNd 欲轉換到的2D層節點
 */
export function Get3Dto2DPos(camera_3D: Camera, camera_2D: Camera, worldPos_3D: Vec3, distNd?: Node, out?: Vec3): Vec3 {
    let cam2: Camera = camera_2D
    let screenPos = camera_3D.worldToScreen(worldPos_3D, tmp_v3)
    let worldPos_2D = cam2.screenToWorld(screenPos, tmp_v3)
    if(distNd) {
        let newPos = distNd.getComponent(UITransform).convertToNodeSpaceAR(worldPos_2D, tmp_v3)
        return v3(newPos)
    }
    return v3(worldPos_2D)
}

/**
 * 螢幕 2D 座標點轉換成 3D 座標點 (screenPos.z 為轉換到 3D 座標的 Z 平面高度)
 * - 因為 3D Root 可能不在原點, 所以需要多轉換回 Root Node 座標
 */
export function Get2Dto3DPos(camera_3D: Camera, screenPos: Vec3): Vec3 {
    let intersect = v3(0, 0, 0)

    let ray = camera_3D.screenPointToRay(screenPos.x, screenPos.y, tmp_ray)
    let h = Math.abs((ray.o.z - (screenPos.z ?? 0)) / ray.d.z)
    intersect.x = ray.o.x + (h * ray.d.x)
    intersect.y = ray.o.y + (h * ray.d.y)
    intersect.z = ray.o.z + (h * ray.d.z)

    return intersect
}

/**
 * 2D座標點擊3D節點
 */
export function Get2Dto3DNode(camera_3D: Camera, screenPos: Vec3, needSort?: boolean): Node[] {
    let ray = camera_3D.screenPointToRay(screenPos.x, screenPos.y, tmp_ray)
    let isHit = PhysicsSystem.instance.raycast(ray)
    let nodes = [] as Node[]

    if (isHit) {
        let results = PhysicsSystem.instance.raycastResults

        if (needSort && results.length > 1) {
            results = Array.from(results)
            results.sort((a, b) => {
                return a.distance - b.distance
            })
        }

        for (let i = 0, len = results.length; i < len; ++i) {
            const result = results[i]
            nodes.push(result.collider.node)
        }
    }

    return nodes
}

//跑分效果
@ccclass('LabelCounter')
class LabelCounter extends Node {
    public m_labelNode: Node = null
    public m_startVal: number = 0
    public m_endVal: number = 0
    public m_totalTimes: number = 0
    public m_currTimes: number = 0
    public m_strFunc: Function

    public RunScore(labelNode: any, startVal: number, endVal: number, time: number, strFunc?: Function, callFunc?:Function): void {
        labelNode.addChild(this)
        this.m_labelNode = labelNode
        this.m_startVal = startVal
        this.m_endVal = endVal
        this.m_totalTimes = Math.ceil(time * 30)
        this.m_currTimes = 0
        this.m_strFunc = strFunc


        Tween.stopAllByTarget(this.m_labelNode)

        tween(this.m_labelNode)
        .delay(1 / 30)
        .call(() => {
            this.m_currTimes = Math.min(this.m_currTimes + 1, this.m_totalTimes)
            let val = this.m_startVal + (this.m_endVal - this.m_startVal) * this.m_currTimes / this.m_totalTimes
            if (this.m_currTimes === this.m_totalTimes) {
                val = this.m_endVal
            }
            val = Math.floor(val)
            if (this.m_strFunc) {
                this.m_labelNode.getComponent(Label).string = this.m_strFunc(val)
            } else {
                this.m_labelNode.getComponent(Label).string = String(val)
            }
        })
        .union()
        .repeat(this.m_totalTimes)
        .call(() => {
            if (callFunc) {
                callFunc()
            }
        })
        .removeSelf()
        .start()
    }

}

function PrintAllBoneR(bone: any, level: number): void {
    let str = ""
    for (let i = 1; i <= level; i++) {
        str = str + "  "
    }
    str = str + '"' + bone.getName() + '"'
    log(str)

    const n = bone.getChildBoneCount()
    for (let i = 1; i <= n; i++) {
        const b = bone.getChildBoneByIndex(i - 1)
        PrintAllBoneR(b, level + 1)
    }
}
//作法須研究
function CreateCustomShader(tag: string, vsh: string, fsh: string): any {
    // let program = cc.GLProgramCache.getInstance().getGLProgram(tag)
    // if (program === null) {
    //     program = cc.GLProgram.createWithFilenames(vsh, fsh)
    //     program.bindAttribLocation(cc.ATTRIBUTE_NAME_POSITION, cc.VERTEX_ATTRIB_POSITION)
    //     program.bindAttribLocation(cc.ATTRIBUTE_NAME_COLOR, cc.VERTEX_ATTRIB_COLOR)
    //     program.bindAttribLocation(cc.ATTRIBUTE_NAME_TEX_COORD, cc.VERTEX_ATTRIB_TEX_COORDS)
    //     program.link()
    //     program.updateUniforms()
    //     cc.GLProgramCache.getInstance().addGLProgram(program, tag)
    // }
    // return program
}

const SHADER_POSITION_TEXTURE_COLOR_NO_MVP = "ShaderPositionTextureColor_noMVP"


