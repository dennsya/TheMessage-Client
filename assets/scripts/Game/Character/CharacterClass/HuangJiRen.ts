import { Character } from "../Character";
import { Sex, CharacterStatus } from "../type";
import { Skill } from "../../../Data/Skills/Skill";
import { CharacterObject } from "../CharacterObject";

export class HuangJiRen extends Character {
  constructor(gameObject?: CharacterObject) {
    super({
      id: 9,
      name: "黄济仁",
      sprite: "images/characters/HuangJiRen",
      status: CharacterStatus.FACE_DOWN,
      sex: Sex.MALE,
      skills: [] as Skill[],
      gameObject: gameObject,
    });
  }
}