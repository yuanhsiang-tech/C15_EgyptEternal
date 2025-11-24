import { v2, Vec2, macro } from "cc";

export namespace MathX
   {
      //--------------------------------------------------------------------------------------------
      /** 取得帕斯卡三角形的第 `line` 層 */
      export function PascalTriangleLine ( line: number ): number[]
      {
         let ptArr: number[] = [ 1 ];
         for ( let i = 1; i < line; i++ )
         {
            ptArr[ i ] = ptArr[ i - 1 ] * ( line - i ) / i;
         }
         return ptArr;
      }

      //--------------------------------------------------------------------------------------------
      /**
       * 在指定範圍裡取隨機值
       * @param min       最小值
       * @param max       最大值
       * @param ratioFunc 分佈函數 (r1) => r2
       * @returns 回傳隨機值
       */
      export function RangedRandom ( min: number, max: number, ratioFunc?: (r1: number)=>number ): number
      {
         if ( min === max )
         {
            return min;
         }
         const rand = Math.random();
         const ratio = ratioFunc ? ratioFunc( rand ) : rand;
         return min + ( max - min ) * ratio;
      }

      //--------------------------------------------------------------------------------------------
      /**
       * 隨機函數坍縮 (將不確定的數值變為確定的數值)
       * @param num        不穩定的數值
       * @param defaultNum 預設數值
       * @returns 回傳穩定化的數值
       * @example
       * (1) => 1
       * ([1, 10]) => 5.3
       * ([-15.5, 12.5]) => -3.14
       */
      export function NumStablize( num: UnstableNum, defaultNum: number = NaN ): number
      {
         let result: number;
         if ( Array.isArray( num ) )
         {
            const [ min, max, func ] = num;
            result = MathX.RangedRandom( min, max, func );
         }
         else
         {
            result = num;
         }
         return isNaN( result ) ? defaultNum : result;
      }

      //--------------------------------------------------------------------------------------------
      /**
       * 取得矩形範圍內隨機位置
       * @param origin 中心點位置
       * @param range  長寬大小 (px)
       * @param angle  旋轉角度 (DEG)
       */
      export function GetRandomRectPos ( origin: Vec2, range: Vec2, angle: number ): Vec2
      {
         let vector = v2( ( MathX.RangedRandom( -range.x, range.x ) / 2 ) | 0,
            ( MathX.RangedRandom( -range.x, range.x ) / 2 ) | 0 ).rotate( angle * macro.RAD );

         return origin.add( vector );
      };

      //--------------------------------------------------------------------------------------------
      /** 取得橢圓範圍內隨機位置
       * @param origin 中心點位置
       * @param range  長短軸大小 (px)
       * @param angle  橢圓旋轉角 (DEG)
       */
      export function GetRandomOvalPos ( origin: Vec2, range: Vec2, angle: number ): Vec2
      {
         let ratio = range.y / Math.max( 1, range.x );
         let radius = Math.random() * range.x * 0.5;
         let radian = Math.random() * Math.PI * 2;
         let vector = v2( radius * Math.cos( radian ),
            radius * Math.sin( radian ) * ratio ).rotate( angle * macro.RAD );
         return origin.add( vector );
      };

      //--------------------------------------------------------------------------------------------
      /**
       * 同時縮放與翻轉
       * @param scaleMin  最小縮放比例
       * @param scaleMax  最大縮放比例
       * @param flipTimes 翻轉總次數
       * @param time      時間尺度 [0, 1]
       * @returns 回傳指定時間時的縮放比
       */
      export function ZoomAndFlip ( scaleMin: number, scaleMax: number, flipTimes: number, time: number ): Vec2
      {
         let s = Math.sin( time * Math.PI ) * ( scaleMax - scaleMin ) + scaleMin;
         let f = Math.cos( time * Math.PI * flipTimes );
         return v2( s * f, s );
      };

      //--------------------------------------------------------------------------------------------
    }