import { _decorator, Component } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 日期時間處理類別
 * 提供日期時間的解析、格式化和各種操作
 */
@ccclass('DateTime')
export class DateTime {
    private static readonly MIN_YEAR = 1400;
    private static readonly MIN_MONTH = 1;
    private static readonly MIN_DAY = 1;
    private static readonly MIN_HOUR = 0;
    private static readonly MIN_MINUTE = 0;
    private static readonly MIN_SECOND = 0;

    private m_year: number = 0;
    private m_month: number = 0;
    private m_day: number = 0;
    private m_hour: number = 0;
    private m_minute: number = 0;
    private m_second: number = 0;

    /**
     * 字串填充函數，用於替代 padStart
     * @param str 要填充的字串
     * @param targetLength 目標長度
     * @param padString 填充字符
     * @returns 填充後的字串
     */
    private static PadStart(str: string, targetLength: number, padString: string = '0'): string {
        if (str.length >= targetLength) {
            return str;
        }
        const padLength = targetLength - str.length;
        return padString.repeat(padLength) + str;
    }

    /**
     * 建構函數
     * @param input 可以是日期字串、時間戳或不傳入參數（使用當前時間）
     */
    constructor(input?: string | number) {
        if (typeof input === 'string') {
            this.ParseFromString(input);
        } else if (typeof input === 'number') {
            this.ParseFromTimestamp(input);
        } else {
            this.ParseFromDate(new Date());
        }
    }

    /**
     * 解析日期字串
     * @param dateString 日期字串，格式: YYYY-MM-DD HH:mm:ss 或 YYYY-MM-DD
     */
    private ParseFromString(dateString: string): void {
        const fullPattern = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;
        const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

        let match = dateString.match(fullPattern);
        if (match) {
            this.m_year = parseInt(match[1], 10);
            this.m_month = parseInt(match[2], 10);
            this.m_day = parseInt(match[3], 10);
            this.m_hour = parseInt(match[4], 10);
            this.m_minute = parseInt(match[5], 10);
            this.m_second = parseInt(match[6], 10);
        } else {
            match = dateString.match(datePattern);
            if (match) {
                this.m_year = parseInt(match[1], 10);
                this.m_month = parseInt(match[2], 10);
                this.m_day = parseInt(match[3], 10);
                this.m_hour = 0;
                this.m_minute = 0;
                this.m_second = 0;
            } else {
                // 如果解析失敗，使用當前時間
                this.ParseFromDate(new Date());
            }
        }
    }

    /**
     * 從時間戳解析
     * @param timestamp 時間戳（毫秒）
     */
    private ParseFromTimestamp(timestamp: number): void {
        this.ParseFromDate(new Date(timestamp));
    }

    /**
     * 從 Date 物件解析
     * @param date Date 物件
     */
    private ParseFromDate(date: Date): void {
        this.m_year = date.getFullYear();
        this.m_month = date.getMonth() + 1; // JavaScript 月份從 0 開始
        this.m_day = date.getDate();
        this.m_hour = date.getHours();
        this.m_minute = date.getMinutes();
        this.m_second = date.getSeconds();
    }

    /**
     * 轉換為時間戳
     * @returns 時間戳（毫秒）
     */
    public ToTimestamp(): number {
        return new Date(this.m_year, this.m_month - 1, this.m_day, this.m_hour, this.m_minute, this.m_second).getTime();
    }

    /**
     * 轉換為字串
     * @returns 日期時間字串，格式: YYYY-MM-DD HH:mm:ss
     */
    public ToString(): string {
        return `${DateTime.PadStart(this.m_year.toString(), 4, '0')}-${DateTime.PadStart(this.m_month.toString(), 2, '0')}-${DateTime.PadStart(this.m_day.toString(), 2, '0')} ${DateTime.PadStart(this.m_hour.toString(), 2, '0')}:${DateTime.PadStart(this.m_minute.toString(), 2, '0')}:${DateTime.PadStart(this.m_second.toString(), 2, '0')}`;
    }

    /**
     * 轉換為日期字串
     * @returns 日期字串，格式: YYYY-MM-DD
     */
    public ToDateString(): string {
        return `${DateTime.PadStart(this.m_year.toString(), 4, '0')}-${DateTime.PadStart(this.m_month.toString(), 2, '0')}-${DateTime.PadStart(this.m_day.toString(), 2, '0')}`;
    }

    /**
     * 轉換為時間字串
     * @returns 時間字串，格式: HH:mm:ss
     */
    public ToTimeString(): string {
        return `${DateTime.PadStart(this.m_hour.toString(), 2, '0')}:${DateTime.PadStart(this.m_minute.toString(), 2, '0')}:${DateTime.PadStart(this.m_second.toString(), 2, '0')}`;
    }

    // Getters
    public Year(): number { return this.m_year; }
    public Month(): number { return this.m_month; }
    public Day(): number { return this.m_day; }
    public Hour(): number { return this.m_hour; }
    public Minute(): number { return this.m_minute; }
    public Second(): number { return this.m_second; }

    /**
     * 檢查是否為最小值
     * @returns 是否為最小值
     */
    public IsMin(): boolean {
        return this.m_year === DateTime.MIN_YEAR && 
               this.m_month === DateTime.MIN_MONTH && 
               this.m_day === DateTime.MIN_DAY &&
               this.m_hour === DateTime.MIN_HOUR && 
               this.m_minute === DateTime.MIN_MINUTE && 
               this.m_second === DateTime.MIN_SECOND;
    }

    /**
     * 複製當前 DateTime 物件
     * @returns 新的 DateTime 物件
     */
    public Clone(): DateTime {
        return new DateTime(this.ToTimestamp());
    }

    /**
     * 靜態方法：解析日期字串
     * @param dateString 日期字串
     * @returns DateTime 物件或 null
     */
    public static Parse(dateString: string): DateTime | null {
        try {
            return new DateTime(dateString);
        } catch (error) {
            return null;
        }
    }

    /**
     * 靜態方法：從時間戳創建
     * @param timestamp 時間戳（毫秒）
     * @returns DateTime 物件
     */
    public static FromTimestamp(timestamp: number): DateTime {
        return new DateTime(timestamp);
    }

    /**
     * 靜態方法：獲取當前時間
     * @returns 當前時間的 DateTime 物件
     */
    public static Now(): DateTime {
        return new DateTime();
    }

    /**
     * 靜態方法：獲取今天的日期（時間為 00:00:00）
     * @returns 今天的 DateTime 物件
     */
    public static Today(): DateTime {
        const now = new Date();
        return new DateTime(`${now.getFullYear()}-${DateTime.PadStart((now.getMonth() + 1).toString(), 2, '0')}-${DateTime.PadStart(now.getDate().toString(), 2, '0')} 00:00:00`);
    }

    /**
     * 靜態方法：獲取本月第一天（時間為 00:00:00）
     * @returns 本月第一天的 DateTime 物件
     */
    public static ThisMonth(): DateTime {
        const now = new Date();
        return new DateTime(`${now.getFullYear()}-${DateTime.PadStart((now.getMonth() + 1).toString(), 2, '0')}-01 00:00:00`);
    }

    /**
     * 靜態方法：獲取最小值
     * @returns 最小值的 DateTime 物件
     */
    public static MinValue(): DateTime {
        return new DateTime(`${DateTime.MIN_YEAR}-${DateTime.PadStart(DateTime.MIN_MONTH.toString(), 2, '0')}-${DateTime.PadStart(DateTime.MIN_DAY.toString(), 2, '0')} ${DateTime.PadStart(DateTime.MIN_HOUR.toString(), 2, '0')}:${DateTime.PadStart(DateTime.MIN_MINUTE.toString(), 2, '0')}:${DateTime.PadStart(DateTime.MIN_SECOND.toString(), 2, '0')}`);
    }

    /**
     * 靜態方法：獲取最大值
     * @returns 最大值的 DateTime 物件
     */
    public static MaxValue(): DateTime {
        return new DateTime('9999-12-31 23:59:59');
    }

    /**
     * 檢查字串是否包含日期時間格式
     * @param inputString 輸入字串
     * @returns 是否包含日期時間格式
     */
    public static ContainsDateTimeString(inputString: string): boolean {
        const fullPattern = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/;
        const datePattern = /\d{4}-\d{2}-\d{2}/;
        
        return fullPattern.test(inputString) || datePattern.test(inputString);
    }

    /**
     * 加上指定的天數
     * @param days 要加的天數
     * @returns 新的 DateTime 物件
     */
    public AddDays(days: number): DateTime {
        const date = new Date(this.ToTimestamp());
        date.setDate(date.getDate() + days);
        return new DateTime(date.getTime());
    }

    /**
     * 加上指定的小時
     * @param hours 要加的小時數
     * @returns 新的 DateTime 物件
     */
    public AddHours(hours: number): DateTime {
        const date = new Date(this.ToTimestamp());
        date.setHours(date.getHours() + hours);
        return new DateTime(date.getTime());
    }

    /**
     * 加上指定的分鐘
     * @param minutes 要加的分鐘數
     * @returns 新的 DateTime 物件
     */
    public AddMinutes(minutes: number): DateTime {
        const date = new Date(this.ToTimestamp());
        date.setMinutes(date.getMinutes() + minutes);
        return new DateTime(date.getTime());
    }

    /**
     * 比較兩個 DateTime 物件
     * @param other 另一個 DateTime 物件
     * @returns 0: 相等, 1: 當前物件較大, -1: 當前物件較小
     */
    public Compare(other: DateTime): number {
        const thisTime = this.ToTimestamp();
        const otherTime = other.ToTimestamp();
        
        if (thisTime === otherTime) return 0;
        return thisTime > otherTime ? 1 : -1;
    }
} 