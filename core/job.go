package core

import (
	"fmt"
	"github.com/MG-RAST/AWE/conf"
	"github.com/MG-RAST/AWE/core/uuid"
	. "github.com/MG-RAST/AWE/logger"
	"io/ioutil"
	"labix.org/v2/mgo/bson"
	"os"
	"strconv"
	"strings"
	"time"
)

const (
	JOB_STAT_SUBMITTED  = "submitted"
	JOB_STAT_INPROGRESS = "in-progress"
	JOB_STAT_COMPLETED  = "completed"
	JOB_STAT_SUSPEND    = "suspend"
	JOB_STAT_DELETED    = "deleted"
)

type Job struct {
	Id          string    `bson:"id" json:"id"`
	Jid         string    `bson:"jid" json:"jid"`
	Info        *Info     `bson:"info" json:"info"`
	Tasks       []*Task   `bson:"tasks" json:"tasks"`
	Script      script    `bson:"script" json:"-"`
	State       string    `bson:"state" json:"state"`
	RemainTasks int       `bson:"remaintasks" json:"remaintasks"`
	UpdateTime  time.Time `bson:"update" json:"updatetime"`
}

//set job's uuid
func (job *Job) setId() {
	job.Id = uuid.New()
	return
}

//set job's jid
func (job *Job) setJid(jid string) {
	job.Jid = jid
}

func (job *Job) initJob(jid string) {
	if job.Info == nil {
		job.Info = new(Info)
	}
	job.Info.SubmitTime = time.Now()
	job.Info.Priority = conf.BasePriority
	job.setId()     //uuid for the job
	job.setJid(jid) //an incremental id for the jobs within a AWE server domain
	job.State = JOB_STAT_SUBMITTED
}

type script struct {
	Name string `bson:"name" json:"name"`
	Type string `bson:"type" json:"type"`
	Path string `bson:"path" json:"-"`
}

//---Script upload
func (job *Job) UpdateFile(params map[string]string, files FormFiles) (err error) {
	_, isRegularUpload := files["upload"]

	if isRegularUpload {
		if err = job.SetFile(files["upload"]); err != nil {
			return err
		}
		delete(files, "upload")
	}

	return
}

func (job *Job) Save() (err error) {
	job.UpdateTime = time.Now()
	db, err := DBConnect()
	if err != nil {
		return
	}
	defer db.Close()

	bsonPath := fmt.Sprintf("%s/%s.bson", job.Path(), job.Id)
	os.Remove(bsonPath)
	nbson, err := bson.Marshal(job)
	if err != nil {
		return
	}
	err = ioutil.WriteFile(bsonPath, nbson, 0644)
	if err != nil {
		return
	}
	err = db.Upsert(job)
	if err != nil {
		return
	}
	return
}

func (job *Job) Mkdir() (err error) {
	err = os.MkdirAll(job.Path(), 0777)
	if err != nil {
		return
	}
	return
}

func (job *Job) SetFile(file FormFile) (err error) {
	if err != nil {
		return
	}
	os.Rename(file.Path, job.FilePath())
	job.Script.Name = file.Name
	return
}

//---Path functions
func (job *Job) Path() string {
	return getPath(job.Id)
}

func (job *Job) FilePath() string {
	if job.Script.Path != "" {
		return job.Script.Path
	}
	return getPath(job.Id) + "/" + job.Id + ".script"
}

func getPath(id string) string {
	return fmt.Sprintf("%s/%s/%s/%s/%s", conf.DATA_PATH, id[0:2], id[2:4], id[4:6], id)
}

//---Task functions
func (job *Job) TaskList() []*Task {
	return job.Tasks
}

func (job *Job) NumTask() int {
	return len(job.Tasks)
}

//---Field update functions
func (job *Job) UpdateState(newState string) (err error) {
	job.State = newState
	return job.Save()
}

//invoked when a task is completed
func (job *Job) UpdateTask(task *Task) (remainTasks int, err error) {
	parts := strings.Split(task.Id, "_")
	rank, err := strconv.Atoi(parts[1])
	if err != nil {
		Log.Error("invalid task " + task.Id)
		return job.RemainTasks, err
	}
	job.Tasks[rank] = task
	job.RemainTasks -= 1
	if job.RemainTasks == 0 {
		job.State = JOB_STAT_COMPLETED
	}
	return job.RemainTasks, job.Save()
}
