import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('job_application_processing_run')
export class JobApplicationProcessingRun {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  status!: 'pending' | 'processing' | 'completed' | 'failed';

  @Column()
  totalJobs!: number;

  @Column()
  evaluatedJobApplications!: number;

  @Column()
  dismissedJobApplications!: number;

  @Column()
  appliedJobApplications!: number;

  @Column({ unique: true })
  threadId!: string;

  @Column()
  createdAt!: Date;
}
