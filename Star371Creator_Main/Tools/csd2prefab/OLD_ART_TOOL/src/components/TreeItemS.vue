<template>
  <li v-show="item.show">
    <div class="title" @click.stop="toggle" @mouseover.stop="triggerHover" @mouseleave.stop="triggerLeave">
      <div id="line" class="fill"></div>
      <i v-if="item.isDir" :class="[isOpen ? 'fa fa-folder-open open' : 'fa fa-folder close', 'file-icon']" @click="toggle"></i>
      <i v-else-if="item.path && item.path.split('.').pop() == 'csd'" class="fa fa-file-text green file-icon" aria-hidden="true"></i>
      <i v-else class="fa fa-file-image-o file-icon" aria-hidden="true" style="color:#0474ED"></i>
      <span id="maintext" class="main" :style="{ color: item.blur ? '#CCCCCC' : 'black' }"> {{ item.text }}</span>
    </div>
    <ul v-show="isOpen">
      <tree-item-s class="item" v-for="(child, index) in item.children" :key="index" :item="child"></tree-item-s>
    </ul>
  </li>
</template>

<style scoped>
span {
  font-family: "Helvetica", "Arial", "LiHei Pro", "黑體-繁", "微軟正黑體", sans-serif;
  font-size: 14px;
}
ul {
  list-style: none;
  margin-left: 20px;
  line-height: 160%;
}
li {
  list-style: none;
}

.open {
  color: #d5a803;
}
.close {
  color: #917201;
}
.main {
  background: none;
  padding: 0 5px;
  transition: background-color 0.1s;
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
  /* background-color: rgb(255, 196, 85); */
  /* display: none; */
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
  name: "TreeItemS",
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
    },
    toggle: function(event) {
      if (this.item.isDir) {
        if (event.altKey) {
          this.isOpen ? this.keepClose() : this.keepOpen();
        } else {
          this.isOpen = !this.isOpen;
        }
      }
    },
    keepClose: function() {
      if (this.item.isDir) {
        this.isOpen = false;
        this.$children.forEach((c) => c.keepClose());
      }
    },
    keepOpen: function() {
      this.isOpen = true;
      this.$children.forEach((c) => c.keepOpen());
    },
    // checkSelect: function() {
    //   if (this.item.children && this.item.children.length > 0) {
    //     this.$children.forEach((c) => c.checkDown(this.isSelected));
    //   } else {
    //     this.item.selected = this.isSelected;
    //     this.$bus.$emit("recheck-file", this.item.path, this.isSelected);
    //     this.$bus.$emit("select-right", this.item.path, this.isSelected);
    //   }
    //   if (this.$parent && this.$parent.item) {
    //     this.$parent.checkUp();
    //   }
    //   // this.$nextTick(() => {
    //   //   this.$bus.$emit("recheck-LR");
    //   // });
    // },
    // checkDown: function(check) {
    //   if (this.item.show) {
    //     this.isSelected = check;
    //     this.item.selected = this.isSelected;
    //     if (this.item.children && this.item.children.length > 0) {
    //       this.$children.forEach((c) => c.checkDown(check));
    //     }
    //   }
    // },
    // checkUp: function() {
    //   if (this.item.show) {
    //     var c = true;
    //     for (var i = 0; i < this.$children.length; i++) {
    //       if (this.$children[i].item.show && !this.$children[i].isSelected) {
    //         c = false;
    //       }
    //     }
    //     this.isSelected = c;
    //     this.item.selected = this.isSelected;
    //     if (this.$parent && this.$parent.item) {
    //       this.$parent.checkUp();
    //     }
    //   }
    // },
  },
  created() {
    // console.log(this.item.text + "  " + this.isOpen);
    // if (this.item.pid === 0) {
    //   this.isAssociated = false;
    // } else {
    //   this.isAssociated = true;
    // }
    this.$bus.$on("check-left", (p) => {
      if (this.item.show) {
        if (p !== "") {
          if (p === this.item.path) {
            if (this.isMarked) {
              this.$el.querySelector("#line").style.backgroundColor = "#7CBFF7";
            } else {
              this.$el.querySelector("#line").style.backgroundColor = "#D9EAFB";
            }
            var el = this.$el.querySelector("#maintext");
            this.$bus.$emit("add-left", el);
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
    this.$bus.$on("click-left", (p) => {
      if (this.item.show && p === this.item.path) {
        this.$el.querySelector("#maintext").scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
    this.$bus.$on("mark-left", (p) => {
      if (p !== "" && this.item.path === p) {
        this.isMarked = true;
        this.$el.querySelector("#line").style.backgroundColor = "#7CBFF7";
      } else {
        this.isMarked = false;
        this.$el.querySelector("#line").style.backgroundColor = "";
      }
    });
    // this.$bus.$on("associate-left", (p, check) => {
    //   if (this.item.show && p === this.item.path) {
    //     this.isSelected = true;
    //     this.item.selected = true;
    //     this.isAssociated = check;
    //   }
    // });
    // this.$bus.$on("select-left", (p, check) => {
    //   if (p !== "" && this.item.path === p) {
    //     this.isSelected = check;
    //     this.checkSelect();
    //   }
    // });
  },
  beforeDestroy() {
    // console.log(this.item.text + "  " + this.isOpen);
    // console.log("left");
    this.$bus.$off("check-left");
    this.$bus.$off("click-left");
    this.$bus.$off("mark-left");
    // this.$bus.$off("associate-left");
    // this.$bus.$off("select-left");
  },
  data: function() {
    return {
      isSync: false,
      isOpen: true,
      isSelected: true,
      isMarked: false,
      isAssociated: false,
      // isHover: false,
    };
  },
};
</script>
