<template>
  <div class="row-container" style="height:40px;margin-bottom:10px">
    <div class="file">
      <span style="flex-grow:1;"><i v-if="newExt == '.zip'" class="fa fa-file-text green" aria-hidden="true"></i><i v-else class="fa fa-folder" aria-hidden="true"></i></span>
      <span class="basic-font file-text">{{ convertFile.name }}</span>
    </div>
    <div class="arrow"><i class="fa fa-arrow-circle-o-right" aria-hidden="true" :style="{ color: convertFile.complete ? '#0EAF0E' : '#A8B0A8' }"></i></div>
    <div class="file">
      <span style="flex-grow:1;"><i v-if="newExt == '.ccs'" class="fa fa-file-text green" aria-hidden="true"></i><i v-else class="fa fa-folder" aria-hidden="true"></i></span>
      <span class="basic-font file-text">{{ convertFile.name.replace(/\.[^/.]+$/, newExt) }}</span>
    </div>
    <div v-show="!convertFile.complete" class="arrow" style="color:red; width: 40px;" @click.stop="clearItem"><i class="fa fa-times" aria-hidden="true"></i></div>
  </div>
</template>

<style scoped>
.file-text {
  font-size: 18px;
  margin-left: 10px;
  font-weight: bold;
  color: black;
  flex-grow: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.file {
  padding: 10px;
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 30%;
  color: #d5a803;
  border: 3px dashed #1e88e5;
  font-size: 24px;
  border-radius: 5px;
  height: 40px;
  line-height: 40px;
  flex-grow: 1;
  margin: 2px;
}
.arrow {
  font-size: 36px;
  height: 40px;
  line-height: 40px;
  text-align: center;
  width: 40px;
  margin: 2px;
}
</style>

<script>
// window.$ = window.jQuery = require("jquery");
export default {
  name: "ConvertItem",
  props: {
    convertFile: Object,
  },
  methods: {
    clearItem: function() {
      this.$bus.$emit("delete-item", this.convertFile.path);
      // console.log();
    },
  },
  created() {
    if (window.registerFuncs.compareExt(this.convertFile.name, ".ccs")) {
      this.newExt = ".zip";
    } else {
      this.newExt = ".ccs";
    }
  },
  beforeDestroy() {},
  data: function() {
    return {
      newExt: "",
      // isMarked: false,
      // isSelected: true,
      // isHover: false,
    };
  },
  // data: function() {},
};
</script>
