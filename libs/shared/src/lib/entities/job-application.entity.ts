import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class JobApplication {
  @PrimaryGeneratedColumn()
  id!: string;

  @Column({ type: 'jsonb' })
  job!: object;

  @Column({ nullable: true })
  coverLetter?: string;

  @Column()
  createdAt!: Date;
}
