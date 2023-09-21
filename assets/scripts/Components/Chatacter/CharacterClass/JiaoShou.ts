import { Character } from "../Character";
import { Sex, CharacterStatus } from "../type";
import { CharacterObject } from "../CharacterObject";
import { DingLun } from "../../Skill/SkillClass/DingLun";
import { ZhenLi } from "../../Skill/SkillClass/ZhenLi";

export class JiaoShou extends Character {
  constructor(gameObject?: CharacterObject) {
    super({
      id: 43,
      name: "教授",
      sprite: "images/characters/NoPanting",
      status: CharacterStatus.FACE_DOWN,
      sex: Sex.MALE,
      gameObject: gameObject,
    });
    this.setSkills([new DingLun(this), new ZhenLi(this)]);
  }
}