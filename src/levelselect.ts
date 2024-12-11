import { ASSETS } from "./lib/assets"
import {
  courseInstances,
  GameState,
  SelectCourse,
  selectCourses,
} from "./logic"

export function initLevelSelect() {
  selectCourse()
}

export function selectCourse() {
  ;(document.getElementById("levelSelect") as HTMLDivElement).style.display =
    "block"
  ;(document.getElementById("courseSelect") as HTMLDivElement).style.display =
    "block"
  ;(document.getElementById("holeSelect") as HTMLDivElement).style.display =
    "none"

  const courseList = document.getElementById("courseList") as HTMLDivElement
  courseList.innerHTML = ""
  let index = 1

  for (const course of selectCourses) {
    const root = document.createElement("div") as HTMLDivElement
    root.classList.add("course")
    const img = document.createElement("img") as HTMLImageElement
    img.src = ASSETS["thumbnails/" + (course.holes[0] + 1) + ".png"]
    img.classList.add("courseImage")
    root.appendChild(img)
    const status = document.createElement("div") as HTMLDivElement
    status.classList.add("courseStatus")
    status.id = course.id + "-course-status"
    root.appendChild(status)
    const info = document.createElement("div") as HTMLDivElement
    info.classList.add("courseInfo")
    root.appendChild(info)
    const courseNumber = document.createElement("span") as HTMLSpanElement
    courseNumber.classList.add("courseNumber")
    courseNumber.innerHTML = "COURSE " + index + ": "
    info.appendChild(courseNumber)
    const courseName = document.createElement("span") as HTMLSpanElement
    courseName.classList.add("courseName")
    courseName.innerHTML = course.name.toUpperCase()
    info.appendChild(courseName)

    courseList.appendChild(root)
    root.addEventListener("click", () => {
      selectHole(course)
    })
    index++
  }
}

function selectHole(course: SelectCourse) {
  ;(document.getElementById("levelSelect") as HTMLDivElement).style.display =
    "block"
  ;(document.getElementById("courseSelect") as HTMLDivElement).style.display =
    "none"
  ;(document.getElementById("holeSelect") as HTMLDivElement).style.display =
    "block"

  const holeList = document.getElementById("holeList") as HTMLDivElement
  holeList.innerHTML = ""
  ;(document.getElementById("playAll") as HTMLDivElement).addEventListener(
    "click",
    () => {
      Rune.actions.selectLevel({
        course: selectCourses.indexOf(course),
        hole: -1,
      })
    }
  )
  for (const hole of course.holes) {
    const root = document.createElement("root") as HTMLDivElement
    root.classList.add("hole")
    holeList.appendChild(root)

    const img = document.createElement("img") as HTMLImageElement
    img.src = ASSETS["thumbnails/" + (hole + 1) + ".png"]
    img.classList.add("holeImage")
    root.appendChild(img)

    const status = document.createElement("div") as HTMLDivElement
    status.classList.add("holeStatus")
    root.appendChild(status)

    const score = document.createElement("div") as HTMLDivElement
    score.classList.add("holeScore")
    status.appendChild(score)

    const complete = document.createElement("div") as HTMLDivElement
    complete.classList.add("holeComplete")
    complete.style.display = "none"
    status.appendChild(complete)

    const label = document.createElement("span") as HTMLSpanElement
    label.innerHTML = "SCORE:"
    label.classList.add("holeScoreLabel")
    score.appendChild(label)

    const value = document.createElement("span") as HTMLSpanElement
    value.innerHTML = ""
    value.classList.add("holeScoreValue")
    value.id = "score-" + hole
    score.appendChild(value)

    const par = document.createElement("span") as HTMLSpanElement
    par.innerHTML = ""
    par.classList.add("holeScorePar")
    par.id = "par-" + hole
    score.appendChild(par)

    const info = document.createElement("div") as HTMLDivElement
    info.classList.add("holeInfo")
    root.appendChild(info)

    const holeNumber = document.createElement("span") as HTMLSpanElement
    holeNumber.classList.add("holeNumber")
    holeNumber.innerHTML = "HOLE " + (hole - course.holes[0] + 1) + ":"
    info.appendChild(holeNumber)

    const holeName = document.createElement("span") as HTMLSpanElement
    holeName.classList.add("holeName")
    holeName.innerHTML = courseInstances[hole].name.toUpperCase()
    info.appendChild(holeName)

    root.addEventListener("click", () => {
      Rune.actions.selectLevel({
        course: selectCourses.indexOf(course),
        hole: hole,
      })
    })
  }
}

export function updateLevelSelectFromState(game: GameState) {
  for (const course of selectCourses) {
    const status = document.getElementById(
      course.id + "-course-status"
    ) as HTMLDivElement

    for (const hole of course.holes) {
      const score = document.getElementById("score-" + hole) as HTMLSpanElement
      const par = document.getElementById("par-" + hole) as HTMLSpanElement
    }
  }
}

export function hideLevelSelect() {
  ;(document.getElementById("levelSelect") as HTMLDivElement).style.display =
    "none"
}
