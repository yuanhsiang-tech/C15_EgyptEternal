<template>
  <li v-show="item.show">
    <div class="title" @mouseover.stop="triggerHover" @mouseleave.stop="triggerLeave" @click.stop="triggerClick">
      <div id="line" class="fill"></div>
      <!-- <input type="checkbox" style="margin-top:4px;margin-right:5px;min-width:16px;min-height:16px" v-model="isSelected" @change="checkSelect" @click.stop="" checked /> -->
      <i class="fa fa-file-text green" aria-hidden="true" style="font-size:16px;width:16px;position:relative;top:4px;"></i>
      <span id="maintext" class="main" :style="{ color: item.blur ? '#CCCCCC' : 'black' }"> {{ item.filename }}</span>
    </div>
    <ul>
      <csd-item class="item" v-for="(child, index) in item.children" :key="index" :item="child"></csd-item>
    </ul>
  </li>
</template>

<style scoped>
span {
  font-family: "Helvetica", "Arial", "LiHei Pro", "黑體-繁", "微軟正黑體", sans-serif;
  font-size: 14px;
}
/* ul {
  list-style: none;
  margin-left: 20px;
  line-height: 160%;
}
li {
  list-style: none;
} */

ul {
  padding: 0;
  margin: 0;
  list-style-type: none;
  position: relative;
}
li {
  list-style-type: none;
  border-left: 1px solid #52789e;
  margin-left: 1em;
}
li div {
  padding-left: 0.75em;
  position: relative;
}
li div::before {
  content: "";
  position: absolute;
  top: 0;
  left: -1px;
  bottom: 50%;
  width: 0.75em;
  border: 1px solid #52789e;
  border-top: 0 none transparent;
  border-right: 0 none transparent;
}
ul > li:last-child {
  border-left: 1px solid transparent;
}

.main {
  user-select: none;
  text-overflow: ellipsis;
  white-space: nowrap;
  position: relative;
  /* top: -3px; */
}
.title {
  position: relative;
  display: flex;
}
.fill {
  /* background-color: #ffc455; */
  /* display: block; */
  margin-left: -10000px;
  margin-right: -10px;
  position: absolute;
  top: 0px;
  right: 0px;
  bottom: 0px;
  left: 0px;
  z-index: -1;
}
</style>

<script>
// window.$ = window.jQuery = require("jquery");
export default {
  name: "CsdItem",
  props: {
    item: Object,
  },
  methods: {
    triggerLeave: function() {
      // this.isHover = false;
      if (this.isMarked) {
        this.$el.querySelector("#line").style.backgroundColor = "#7CBFF7";
      } else {
        this.$el.querySelector("#line").style.backgroundColor = "";
      }
    },
    triggerHover: function() {
      // this.isHover = true;
      if (this.isMarked) {
        this.$el.querySelector("#line").style.backgroundColor = "#7CBFF7";
      } else {
        this.$el.querySelector("#line").style.backgroundColor = "#D9EAFB";
      }
      this.$bus.$emit("reset-left");
      this.$bus.$emit("check-left", this.item.path);
    },
    triggerClick: function() {
      this.$bus.$emit("scroll-left");
      this.$bus.$emit("mark-left", this.item.path);
      this.$bus.$emit("mark-right", this.item.path);
    },
    checkSelect: function() {
      this.$bus.$emit("select-left", this.item.path, this.isSelected);
    },
  },
  created() {
    // this.$bus.$off("check-right");
    // this.$bus.$off("click-right");
    // this.$bus.$off("click-mark");
    // this.isMarked = false;
    // if (this.item.pid !== 0) {
    //   this.$nextTick(() => {
    //     this.$bus.$emit("associate-left", this.item.path, true);
    //   });
    // }
    this.$bus.$on("check-right", (p) => {
      if (this.item.show) {
        if (p !== "") {
          if (p === this.item.path) {
            if (this.isMarked) {
              this.$el.querySelector("#line").style.backgroundColor = "#7CBFF7";
            } else {
              this.$el.querySelector("#line").style.backgroundColor = "#D9EAFB";
            }
            var el = this.$el.querySelector("#maintext");
            this.$bus.$emit("add-right", el);
          } else if (this.isMarked && p !== this.item.path) {
            this.$el.querySelector("#line").style.backgroundColor = "#7CBFF7";
          } else {
            this.$el.querySelector("#line").style.backgroundColor = "";
          }
        } else {
          if (this.isMarked) {
            this.$el.querySelector("#line").style.backgroundColor = "#7CBFF7";
          } else {
            this.$el.querySelector("#line").style.backgroundColor = "";
          }
        }
      }
    });
    this.$bus.$on("click-right", (p) => {
      if (p === this.item.path) {
        this.$el.querySelector("#maintext").scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
    this.$bus.$on("mark-right", (p) => {
      if (p !== "" && this.item.path === p) {
        this.isMarked = true;
        this.$el.querySelector("#line").style.backgroundColor = "#7CBFF7";
      } else {
        this.isMarked = false;
        this.$el.querySelector("#line").style.backgroundColor = "";
      }
    });
    this.$bus.$on("select-right", (p, check) => {
      if (p !== "" && this.item.path === p) {
        this.isSelected = check;
      }
    });
  },
  beforeDestroy() {
    // console.log("right");
    this.$bus.$off("check-right");
    this.$bus.$off("click-right");
    this.$bus.$off("mark-right");
    this.$bus.$off("select-right");
  },
  data: function() {
    return {
      isMarked: false,
      isSelected: true,
      // isHover: false,
    };
  },
  // data: function() {},
};
</script>
