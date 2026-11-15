import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Job } from './job.entity';
import { Cv } from './cv.entity';
import { DatabaseEntity } from './databaseEntity.interface';
import { JobEvaluationDecision } from '../types/job-evaluation-decision';

@Entity('job_application')
export class JobApplication implements DatabaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: string;

  @ManyToOne(() => Job)
  job!: Job;

  @ManyToOne(() => Cv, (cv) => cv.jobApplications, { nullable: false })
  cv!: Cv;

  @Column({ nullable: true })
  coverLetter?: string;

  @Column({
    type: 'enum',
    enum: JobEvaluationDecision,
    enumName: 'job_application_evaluation_result_enum',
    nullable: true,
  })
  evaluationResult?: JobEvaluationDecision | null;

  @Column({ nullable: true })
  status?: 'processing' | 'applied' | 'not-applied' | 'dismissed' | 'error';

  @Column({ nullable: true })
  reason?: string;

  @CreateDateColumn()
  createdAt?: Date;
}
