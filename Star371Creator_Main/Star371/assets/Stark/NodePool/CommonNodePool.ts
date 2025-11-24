import { NodePool, Node } from "cc";
import { NumberUtils } from "../FuncUtils/NumberUtils";
import { Component } from "cc";
import { isValid } from "cc";

type argOption = {
    maxSize?: number;
    // 之後再補充各個情況的handler
}

const MINIMUM_SIZE = 1;
const DEFAULT_SIZE = 16;
const MAXIMUM_SIZE = 512;


export default class CommonNodePool
{
    
    protected m_pool        :NodePool   = null;
    protected m_size        :number     = DEFAULT_SIZE;
    protected m_nodeCreator :() => Node = null;
    protected m_takeHandler: ( node: Node ) => void = null;
    protected m_backHandler: ( node: Node ) => void = null;
    protected m_deadHandler: ( node: Node ) => void = null;

    /**
     * 節點保險箱
     * @param nodeCreator 
     * @param options 
     */
    constructor ( nodeCreator: () => Node, option?: {
        maxSize?: number,
        initCount?: number,
        takeHandler?: ( node: Node ) => void;
        backHandler?: ( node: Node ) => void;
        deadHandler?: ( node: Node ) => void;
        poolHandlerComp?: string | { prototype: Component; };
     } )
    {
        this.m_pool = new NodePool();
        this.m_size = NumberUtils.Clamp( option?.maxSize ?? DEFAULT_SIZE, MINIMUM_SIZE, MAXIMUM_SIZE );
        this.m_nodeCreator  = nodeCreator;
        this.m_takeHandler = option && option.takeHandler || null;
        this.m_backHandler = option && option.backHandler || null;
        this.m_deadHandler = option && option.deadHandler || null;

        let initCount = option && option.initCount || 0;
        let handlerComp = option && option.poolHandlerComp || undefined;

        initCount = Math.min( Math.max( 0, initCount ), this.m_size );
    
        for ( let i = 0; i < initCount; i++ )
        {
            let node = this.CreateNode() 
            this.m_pool.put( node );
        }
    }

    /** 取得節點池 (cc) */
    public get Pool(): Node
    {
        let node = null;
        while ( !isValid( node, true ) )
        {
            node = this.m_pool.get();
            if ( node == null )
            {
                node = this.CreateNode();
            }
        }
        this.OnNodeTake( node );
        return node;
    }

    /** 從節點池取得節點 */
    public Take(): Node
    {
        let node = null;
        while ( !isValid( node, true ) )
        {
            node = this.m_pool.get();
            if ( node == null )
            {
                node = this.CreateNode();
            }
        }
        this.OnNodeTake( node );
        return node;
    }

    /** 將節點放回節點池 */
    public Back( node: Node )
    {
        if ( this.m_pool.size() < this.m_size )
            {
               this.OnNodeBack( node );
               this.m_pool.put( node );
            } else
            {
               this.OnNodeBack( node );
               this.OnNodeDead( node );
               isValid( node, true ) && node.destroy();
            }
    }

    /** 清空節點池 */
    public Clear()
    {
        this.m_pool.clear();
    }

    
   //--------------------------------------------------------------------------------------------
   /** 產生新 argCreator */
   protected CreateNode (): Node
   {
      return this.m_nodeCreator ? this.m_nodeCreator() : null;
   }

   /** argCreator 銷毀時執行 */
   protected OnNodeDead ( node: Node )
   {
      this.m_deadHandler && this.m_deadHandler( node );
   }

   /** 取得 argCreator 時執行 */
   protected OnNodeTake ( node: Node )
   {
      this.m_takeHandler && this.m_takeHandler( node );
   }

   /** 歸還 argCreator 時執行 */
   protected OnNodeBack ( node: Node )
   {
      this.m_backHandler && this.m_backHandler( node );
   }
}